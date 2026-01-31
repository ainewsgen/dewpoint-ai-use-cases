from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..services.scraper import search_google

router = APIRouter()

class SearchRequest(BaseModel):
    keywords: str # Acts as "Industry" or generic keywords
    job_title: Optional[str] = None
    location: Optional[str] = None
    platform: str = "google" # google, linkedin, jobs, freelance

class ScrapedLead(BaseModel):
    name: str
    url: str
    description: str
    source: str

from ..db.session import get_db
from sqlalchemy.orm import Session
from fastapi import Depends
from ..models.crm import CRMIntegration

@router.post("/search", response_model=List[ScrapedLead])
def search_leads_endpoint(request: SearchRequest, db: Session = Depends(get_db)):
    query = ""
    
    # Check for Google Search Integration
    integration = db.query(CRMIntegration).filter(
        CRMIntegration.user_id == 1,
        CRMIntegration.crm_type == 'google_search',
        CRMIntegration.is_connected == True
    ).first()
    
    api_key = integration.api_key if integration else None
    cx = integration.api_secret if integration else None
    
    # 1. Base Query Construction based on Platform
    if request.platform == "linkedin":
        # Targeted LinkedIn Search
        query = f'site:linkedin.com/in/ "{request.keywords}"'
        if request.job_title:
            query += f' "{request.job_title}"'
            
    elif request.platform == "jobs":
        # Job Boards (Indeed, Monster) -> Targeting Hiring Managers
        # Logic: Find job postings for the 'Job Title' in 'Industry'
        query = f'(site:indeed.com OR site:monster.com)'
        if request.job_title:
             query += f' "{request.job_title}"'
        query += f' "{request.keywords}" "Hiring Manager"'
        
    elif request.platform == "freelance":
        # Freelance Platforms (Upwork, Fiverr) -> Targeting Service Seekers
        # Logic: Find requests for services
        query = f'(site:upwork.com OR site:fiverr.com)'
        query += f' "{request.keywords}" "Looking for"' 
        # Exclude common freelancer profiles to find CLIENTS (hard via google search but we try)
        # Often "Looking for" appears in job posts or client briefs.
        
    else:
        # General Google
        query = request.keywords
        if request.job_title:
            query += f' "{request.job_title}"'

    # 2. Append Location
    if request.location:
        query += f" in {request.location}"
    
    results = search_google(query, limit=10, api_key=api_key, cx=cx)
    
    # Post-process source for clarity
    for res in results:
        res.source = f"scraper_{request.platform}"
        
    return results
