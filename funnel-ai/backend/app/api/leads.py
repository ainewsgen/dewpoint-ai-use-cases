from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from ..db.session import get_db
from ..models.lead import Lead as LeadModel
from ..models.crm import LeadNote as LeadNoteModel
from ..schemas.lead import Lead, LeadCreate, LeadUpdate, LeadNote, LeadNoteCreate
from ..services.scoring import calculate_lead_score
from ..models.brand import BrandSettings
from .brand import get_current_brand_settings
from .users import get_current_user
from ..models.user import User as UserModel

router = APIRouter()

from ..models.crm import FollowUp
from datetime import datetime, date

from typing import Optional

@router.get("/", response_model=List[Lead])
def read_leads(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    source: Optional[str] = None,
    min_score: Optional[int] = None,
    next_action_before: Optional[date] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = db.query(LeadModel)
    
    if status:
        query = query.filter(LeadModel.status == status)
    if source:
        query = query.filter(LeadModel.source == source)
    if min_score is not None:
        query = query.filter(LeadModel.score >= min_score)
    if search:
        # Simple search across name and company
        search_term = f"%{search}%"
        query = query.filter(
            (LeadModel.first_name.ilike(search_term)) |
            (LeadModel.last_name.ilike(search_term)) |
            (LeadModel.company.ilike(search_term))
        )

    if next_action_before:
        # Leads with pending followups due on or before date
        query = query.join(FollowUp).filter(
            FollowUp.status == 'pending',
            FollowUp.scheduled_at <= datetime.combine(next_action_before, datetime.max.time())
        ).distinct()

    # Apply Sorting
    if hasattr(LeadModel, sort_by):
        column = getattr(LeadModel, sort_by)
        if sort_order == "asc":
            query = query.order_by(column.asc())
        else:
            query = query.order_by(column.desc())
    else:
        # Fallback default
        query = query.order_by(LeadModel.created_at.desc())
        
    leads = query.offset(skip).limit(limit).all()
    
    # Populate next_scheduled_action manually for each lead
    # Efficient approach would be a join, but simple loop is fine for MVP limit=100
    for lead in leads:
        next_followup = db.query(FollowUp).filter(
            FollowUp.lead_id == lead.id, 
            FollowUp.status == 'pending',
            FollowUp.scheduled_at >= datetime.now()
        ).order_by(FollowUp.scheduled_at.asc()).first()
        
        if next_followup:
            lead.next_scheduled_action = next_followup.scheduled_at
            
    return leads


@router.post("/", response_model=Lead)
def create_lead(lead: LeadCreate, force: bool = False, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    try:
        # 1. Fetch current user (MVP: ID=1)
        user = current_user
        business_type = user.business_type if user else "b2b"
        
        # 2. Validation Logic
        # Check for duplicate email
        if lead.email:
            existing_lead = db.query(LeadModel).filter(LeadModel.email == lead.email).first()
            if existing_lead:
                if existing_lead.disqualification_reason:
                    if force:
                        # Reactivate lead
                        existing_lead.status = "new"
                        existing_lead.disqualification_reason = None
                        existing_lead.disqualified_at = None
                        existing_lead.lifecycle_stage = "Prospect - Cold" # Reset stage
                        db.commit()
                        db.refresh(existing_lead)
                        return existing_lead
                    else:
                        raise HTTPException(
                            status_code=409, 
                            detail=f"Lead previously disqualified on {existing_lead.disqualified_at.date() if existing_lead.disqualified_at else 'unknown date'}: {existing_lead.disqualification_reason}"
                        )
                raise HTTPException(status_code=400, detail=f"A lead with email {lead.email} already exists.")
                
        # Check for duplicate name (First + Last)
        if lead.first_name and lead.last_name:
            existing_name = db.query(LeadModel).filter(
                LeadModel.first_name == lead.first_name, 
                LeadModel.last_name == lead.last_name
            ).first()
            if existing_name:
                if existing_name.disqualification_reason:
                    raise HTTPException(
                        status_code=409, 
                        detail=f"Lead previously disqualified on {existing_name.disqualified_at.date() if existing_name.disqualified_at else 'unknown date'}: {existing_name.disqualification_reason}"
                    )
                raise HTTPException(status_code=400, detail=f"A lead with name {lead.first_name} {lead.last_name} already exists.")

        if business_type == "b2b":
            if not lead.company or not lead.title:
                # We could raise error, but for MVP let's just allow it with a warning or fallback?
                # User requirement: "mandatory" for B2B. So let's enforcing strictness if manual add.
                if not lead.company:
                   raise HTTPException(status_code=400, detail="Company name is required for B2B leads.")
                   
        elif business_type == "b2c":
            # B2C might trigger unique identifiers or contact methods differently
            pass
            
        # 2b. Check Plan Limits (New)
        from datetime import datetime, timedelta
        from ..models.plan import Plan as PlanModel
        
        # Reset usage if needed
        # MVP: Reset weekly. If usage_reset_at is older than 7 days, reset.
        if user.usage_reset_at:
             # Ensure timezone aware comparison isn't an issue (using naive here for MVP simplicity or relying on DB)
             # Assuming UTC/Server time consistency
             days_diff = (datetime.now() - user.usage_reset_at).days
             if days_diff >= 7:
                 user.usage_leads_weekly = 0
                 user.usage_reset_at = datetime.now()
                 db.commit()
                 
        # Get Weekly Limit logic
        user_tier = (user.plan_tier or "free").lower().strip()
        if user_tier == "free": user_tier = "starter" # Normalized
        
        plan = db.query(PlanModel).filter(func.lower(PlanModel.name) == user_tier).first()
        weekly_limit = plan.weekly_limit if plan else 50 # Default fallback
        
        # Only count 'sourced' leads towards limit (scraper or maybe csv?)
        # Let's count ALL new leads for simplicity as per "1000 leads/run/week" implies volume constraint
        if user.usage_leads_weekly >= weekly_limit:
             raise HTTPException(
                status_code=402, # Payment Required/Limit Exceeded
                detail=f"Weekly lead limit of {weekly_limit} reached. Upgrade your plan to add more leads."
            )

        db_lead = LeadModel(**lead.model_dump())
        
        # Apply scoring
        weights = get_current_brand_settings(db)
        db_lead.score = calculate_lead_score(db_lead, weights)
        
        db.add(db_lead)
        
        # AUTO-ENRICHMENT for Scraper Leads
        # "Enrich -> fill emails/phones/contact pages"
        if lead.source and lead.source.startswith("scraper_"):
            from ..services.enrichment import enrich_lead_service
            # Need to commit first to get ID? usually not for object-level changes but safe to flush
            db.flush() 
            updates = enrich_lead_service(db_lead)
            for key, value in updates.items():
                setattr(db_lead, key, value)
                
            # Recalculate score after enrichment?
            db_lead.score = calculate_lead_score(db_lead, weights)
        
        # Increment Usage
        user.usage_leads_weekly += 1
        
        db.commit()
        db.refresh(db_lead)
        return db_lead
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR IN CREATE_LEAD: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/recalculate")
def recalculate_scores(db: Session = Depends(get_db)):
    weights = get_current_brand_settings(db)
    leads = db.query(LeadModel).all()
    for lead in leads:
        lead.score = calculate_lead_score(lead, weights)
    db.commit()
    return {"status": "success", "count": len(leads)}

@router.get("/{lead_id}", response_model=Lead)
def read_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.put("/{lead_id}", response_model=Lead)
def update_lead(lead_id: int, lead_update: LeadUpdate, db: Session = Depends(get_db)):
    db_lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if db_lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    update_data = lead_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_lead, key, value)
        
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

class DisqualifyRequest(BaseModel):
    reason: str

@router.post("/{lead_id}/disqualify", response_model=Lead)
def disqualify_lead(lead_id: int, request: DisqualifyRequest, db: Session = Depends(get_db)):
    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    lead.status = "lost"
    lead.lifecycle_stage = "Disqualified"
    lead.disqualification_reason = request.reason
    lead.disqualified_at = datetime.now()
    
    db.commit()
    db.refresh(lead)
    db.refresh(lead)
    return lead

@router.get("/{lead_id}/notes", response_model=List[LeadNote])
def read_lead_notes(lead_id: int, db: Session = Depends(get_db)):
    notes = db.query(LeadNoteModel).filter(LeadNoteModel.lead_id == lead_id).order_by(LeadNoteModel.created_at.desc()).all()
    return notes

@router.post("/{lead_id}/notes", response_model=LeadNote)
def create_lead_note(lead_id: int, note: LeadNoteCreate, db: Session = Depends(get_db)):
    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    db_note = LeadNoteModel(lead_id=lead_id, content=note.content)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@router.post("/import")
async def import_leads_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Import leads from CSV file.
    Expected columns: first_name, last_name, email, phone, company, title, location
    """
    import csv
    import io
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    weights = get_current_brand_settings(db)
    imported_count = 0
    errors = []
    
    for row_num, row in enumerate(csv_reader, start=2):
        try:
            # Map CSV columns to lead fields
            lead_data = {
                'first_name': row.get('first_name', '').strip(),
                'last_name': row.get('last_name', '').strip(),
                'email': row.get('email', '').strip() or None,
                'phone': row.get('phone', '').strip() or None,
                'company': row.get('company', '').strip() or None,
                'title': row.get('title', '').strip() or None,
                'location': row.get('location', '').strip() or None,
                'linkedin_url': row.get('linkedin_url', '').strip() or None,
                'secondary_email': row.get('secondary_email', '').strip() or None,
                'secondary_phone': row.get('secondary_phone', '').strip() or None,
                'sentiment': row.get('sentiment', '').strip() or None,
                'customer_tier': row.get('customer_tier', 'Standard').strip() or "Standard",
                'lifecycle_stage': row.get('lifecycle_stage', 'Prospect - Cold').strip() or "Prospect - Cold",
                'services_used': row.get('services_used', '[]').strip() or "[]",
                # Parse numeric/date fields safely later if needed, but for now simple string/cast is okay for MVP
                # revenue_last_year, contract_signed_date etc are tricky without strict validation, 
                # but let's add them as direct strings if model supports (it does, SQLA handles casting usually or we need to be careful)
                # Actually Lead Model expects Float/Date. We should parse them or leave null if fail.
                'source': 'csv_import'
            }
            
            # Basic parsing for non-string fields
            try:
                if row.get('revenue_last_year'):
                     lead_data['revenue_last_year'] = float(row.get('revenue_last_year').strip())
            except: pass

            try:
                if row.get('contract_signed_date'):
                     # Expect YYYY-MM-DD or similar logic, keeping simple for now
                     from datetime import datetime
                     # Remove this if too brittle, but let's try standard ISO
                     # actually, let's just use string if model allows? No model is Date.
                     # Let's skip complex date parsing for this iteration to avoid errors.
                     pass
            except: pass
            
            # Skip empty rows
            if not lead_data['first_name'] and not lead_data['last_name']:
                continue
                
            # Deduplication Check (CSV Import)
            first_name = lead_data['first_name']
            last_name = lead_data['last_name']
            email = lead_data['email']
            
            duplicate_found = False
            
            # Check Email
            if email:
                 if db.query(LeadModel).filter(LeadModel.email == email).first():
                     errors.append(f"Row {row_num}: Duplicate email ({email}) - Skipped")
                     duplicate_found = True
            
            # Check Name if not already found duplicate by email
            if not duplicate_found and first_name and last_name:
                if db.query(LeadModel).filter(LeadModel.first_name == first_name, LeadModel.last_name == last_name).first():
                    errors.append(f"Row {row_num}: Duplicate name ({first_name} {last_name}) - Skipped")
                    duplicate_found = True
                    
            if duplicate_found:
                continue
                
            db_lead = LeadModel(**lead_data)
            db_lead.score = calculate_lead_score(db_lead, weights)
            
            db.add(db_lead)
            imported_count += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return {
        "status": "success",
        "imported": imported_count,
        "errors": errors
    }

from ..services.enrichment import enrich_lead_service

@router.post("/{lead_id}/enrich", response_model=Lead)
def enrich_single_lead(lead_id: int, db: Session = Depends(get_db)):
    """Enrich a specific lead with missing data."""
    lead = db.query(LeadModel).filter(LeadModel.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    updates = enrich_lead_service(lead)
    
    if not updates:
        return lead # No changes
        
    for key, value in updates.items():
        setattr(lead, key, value)
        
    db.commit()
    db.refresh(lead)
    return lead

@router.post("/enrich/all")
def enrich_all_leads(db: Session = Depends(get_db)):
    """Bulk enrich all leads (Demo version)."""
    leads = db.query(LeadModel).all()
    count = 0
    stats = {"emails": 0, "phones": 0, "linkedin": 0}
    
    for lead in leads:
        updates = enrich_lead_service(lead)
        if updates:
            count += 1
            if "email" in updates: stats["emails"] += 1
            if "phone" in updates: stats["phones"] += 1
            if "linkedin_url" in updates: stats["linkedin"] += 1
            
            for key, value in updates.items():
                setattr(lead, key, value)
    
    if count > 0:
        db.commit()
        
    return {
        "status": "success",
        "enriched_count": count,
        "details": stats
    }
