from sqlalchemy.orm import Session
from ..models.lead_engine import LeadRun, Company, LeadRunStatus, WorkspacePreset, CompanyContact, ContactType
from ..models.lead import Lead
from datetime import datetime
import json

class LeadEngine:
    def __init__(self, db: Session, user_id: str = None):
        self.db = db
        self.user_id = user_id

    def start_run(self, preset_id: int = None, config_override: dict = None, workspace_id: int = 1):
        """
        Creates a new LeadRun and triggers the async processing.
        """
        # 1. Resolve Config
        config = {}
        if preset_id:
            preset = self.db.query(WorkspacePreset).get(preset_id)
            if preset:
                config = preset.config_blob
        
        if config_override:
            config.update(config_override)

        # 2. Create Run Record
        run = LeadRun(
            tenant_id=1, # Default
            workspace_id=workspace_id,
            preset_id=preset_id,
            config_blob=config,
            created_by_user_id=self.user_id,
            status=LeadRunStatus.queued.value,
            stats={"discovered": 0, "leads_created": 0}
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        # 3. Trigger Async Task (For MVP we call directly or use BackgroundTasks if passed)
        # In a real app, this would be celery.delay(run.id)
        # Here we will simulate async by returning and having the caller use BackgroundTasks
        return run

    def process_run(self, run_id: int):
        """
        The worker function that executes the run.
        """
        run = self.db.query(LeadRun).get(run_id)
        if not run: return
        
        try:
            run.status = LeadRunStatus.running.value
            run.started_at = datetime.now()
            self.db.commit()
            
            config = run.config_blob
            platform = config.get("platform", "google")
            
            results = []
            
            # 1. Dispatch based on Strategy
            if platform == 'jobs':
                # Path B: Intent (ATS / Jobs)
                results = self._intent(config)
            else:
                # Path A: Discovery (Google / General)
                results = self._discover(config)
            
            # 2. Process Results -> Company -> Lead
            created_count = 0
            for res in results:
                try:
                    # Upsert Company
                    company = self._upsert_company(res['company_name'], res['url'])
                    
                    # Upsert Lead
                    self._upsert_lead(
                        run.workspace_id, 
                        company, 
                        first_name="Contact", 
                        last_name=f"at {res['company_name']}",
                        title=res.get('job_title', "Sourced Lead"),
                        source_url=res.get('source_url', res['url'])
                    )
                    created_count += 1
                    
                    # Enrichment (Crawling)
                    self._enrich(company)

                except Exception as e:
                    print(f"Error processing result {res}: {e}")
            
            # Update Stats
            run.stats = {"discovered": len(results), "leads_created": created_count}
            run.status = LeadRunStatus.completed.value
            run.finished_at = datetime.now()
            self.db.commit()
            
        except Exception as e:
            run.status = LeadRunStatus.failed.value
            run.error = str(e)
            self.db.commit()
            print(f"Lead Run Failed: {e}")

    def _discover(self, config):
        """Path A: Light Discovery via Google Search"""
        from ..services.scraper import search_google
        
        keywords = config.get("keywords", "")
        location = config.get("location", "")
        limit = config.get("limit", 10)
        
        # Determine API Creds (Fetch from DB integration for MVP or passed in)
        # For MVP we rely on scraper.py using passed args or scraping fallback
        # Ideally fetch CRMIntegration key here.
        # But scraper.py logic handles simple calls.
        
        # Query: "{keywords} in {location}" or just "{keywords}"
        query = f"{keywords}"
        if location:
            query += f" in {location}"
            
        print(f"Discovery Query: {query}")
        raw_results = search_google(query, limit=limit)
        
        # Normalize
        normalized = []
        for r in raw_results:
            normalized.append({
                "company_name": r['name'],
                "url": r['url'],
                "job_title": "Sourced Lead", 
                "source_url": r['url']
            })
        return normalized

    def _intent(self, config):
        """Path B: Intent via ATS Search"""
        from ..services.scraper import search_google
        
        keywords = config.get("keywords", "") # Skills/Role
        location = config.get("location", "")
        limit = config.get("limit", 10)
        
        # Common ATS domains to check
        ats_domains = ["greenhouse.io", "lever.co", "jobvite.com", "workday.com"]
        
        normalized = []
        per_domain_limit = max(2, limit // len(ats_domains))
        
        for domain in ats_domains:
            # Query: site:greenhouse.io "Software Engineer" "Remote"
            query = f"site:{domain} \"{keywords}\""
            if location:
                query += f" \"{location}\""
            
            print(f"Intent Query: {query}")
            raw_results = search_google(query, limit=per_domain_limit)
            
            for r in raw_results:
                # Parse Title: "Role at Company" or "Company - Role"
                parsed = self._parse_ats_title(r['name'], domain)
                normalized.append({
                    "company_name": parsed['company'],
                    "url": r['url'], # Job Post URL
                    "job_title": parsed['role'],
                    "source_url": r['url']
                })
                
        return normalized

    def _parse_ats_title(self, title, domain):
        """
        Heuristic to extract Company and Role from search titles like:
        'Senior Engineer at Acme Corp' (Greenhouse common)
        'Acme Corp - Senior Engineer'
        """
        company = "Unknown"
        role = "Candidate"
        
        lower_title = title.lower()
        
        if " at " in title:
            # "Role at Company"
            parts = title.split(" at ")
            role = parts[0].strip()
            company = parts[-1].strip() # Take last part as company?
            # Issue: "Engineer at Company - Apply Now"
            if " - " in company:
                company = company.split(" - ")[0]
        elif " - " in title:
            # "Company - Role" or "Role - Company"
            parts = title.split(" - ")
            # Hard to guess order without heuristics. 
            # Assume first is Company often for "Company - Careers"?
            # Actually Greenhouse often does "Role at Company"
            company = parts[0].strip()
            role = parts[1].strip() if len(parts) > 1 else "Candidate"
        else:
            company = title
            
        # Clean up
        company = company.replace("Careers", "").replace("Job Board", "").strip()
        
        return {"company": company, "role": role}

    def _enrich(self, company: Company):
        """
        Crawls the company website to find contact info.
        """
        import requests
        import re
        from bs4 import BeautifulSoup
        
        if not company.website_url:
            return
            
        print(f"Enriching {company.name} at {company.website_url}...")
        
        try:
            # 1. Fetch
            headers = {"User-Agent": "Mozilla/5.0 (Compatible; FunnelBot/1.0)"}
            resp = requests.get(company.website_url, headers=headers, timeout=5)
            if resp.status_code != 200:
                print(f"Enrich failed: {resp.status_code}")
                return
                
            soup = BeautifulSoup(resp.text, 'html.parser')
            text = soup.get_text()
            
            # 2. Extract Emails
            # Simple regex
            emails = set(re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text))
            
            # Filter emails (exclude generic junk if possible, or just save all)
            # Save to CompanyContact
            for email in emails:
                # Basic validation or filtering
                if any(x in email.lower() for x in ['.png', '.jpg', '.gif', 'sentry', 'example']):
                    continue
                    
                # Check if exists
                exists = self.db.query(CompanyContact).filter(
                    CompanyContact.company_id == company.id,
                    CompanyContact.type == ContactType.email,
                    CompanyContact.value == email
                ).first()
                
                if not exists:
                    contact = CompanyContact(
                        company_id=company.id,
                        type=ContactType.email,
                        value=email,
                        label="Scraped",
                        source_url=company.website_url
                    )
                    self.db.add(contact)
                    print(f"Found email: {email}")
            
            self.db.commit()
            
        except Exception as e:
            print(f"Enrich error for {company.name}: {e}")

    def _upsert_company(self, name, website):
        # fuzzy match or precise match
        # Basic exact match on name for MVP
        company = self.db.query(Company).filter(Company.name == name).first()
        if not company:
            company = Company(
                tenant_id=1,
                name=name,
                domain_root=website,
                website_url=website
            )
            self.db.add(company)
            self.db.commit()
            self.db.refresh(company)
        return company

    def _upsert_lead(self, workspace_id, company, first_name, last_name, title, source_url):
        # Check if lead exists for this company
        existing_lead = self.db.query(Lead).filter(
            Lead.company_id == company.id
        ).first() # Simplify: 1 lead per company for this MVP run
        
        if existing_lead:
            return existing_lead
            
        # Create Lead
        new_lead = Lead(
            first_name=first_name,
            last_name=last_name,
            company=company.name, # Legacy field
            title=title,
            status="new",
            source="lead_engine",
            company_id=company.id,
            bucket="review",
            meta_data={"source_url": source_url}
        )
        self.db.add(new_lead)
        self.db.commit()
        return new_lead
