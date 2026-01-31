from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..db.session import get_db
from ..models.campaign import Campaign as CampaignModel, CampaignStep as CampaignStepModel, CampaignLead as CampaignLeadModel
from ..models.lead import Lead as LeadModel
from ..schemas.campaign import Campaign, CampaignCreate, CampaignUpdate, CampaignStepCreate, CampaignStep, CampaignLeadCreate, CampaignStepUpdate
from ..schemas.campaign import Campaign, CampaignCreate, CampaignUpdate, CampaignStepCreate, CampaignStep, CampaignLeadCreate, CampaignStepUpdate
from ..services.campaign_runner import CampaignRunner
import traceback

router = APIRouter()

# --- Campaigns CRUD ---

@router.get("/", response_model=List[Campaign])
def read_campaigns(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    campaigns = db.query(CampaignModel).options(joinedload(CampaignModel.steps)).offset(skip).limit(limit).all()
    # Sort steps by order for each campaign
    for c in campaigns:
        c.steps.sort(key=lambda s: s.order)
    return campaigns

@router.post("/", response_model=Campaign)
def create_campaign(campaign: CampaignCreate, db: Session = Depends(get_db)):
    db_campaign = CampaignModel(**campaign.model_dump())
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

@router.get("/{campaign_id}", response_model=Campaign)
def read_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(CampaignModel).options(joinedload(CampaignModel.steps)).filter(CampaignModel.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.steps.sort(key=lambda s: s.order)
    return campaign

@router.put("/{campaign_id}", response_model=Campaign)
def update_campaign(campaign_id: int, campaign_update: CampaignUpdate, db: Session = Depends(get_db)):
    db_campaign = db.query(CampaignModel).filter(CampaignModel.id == campaign_id).first()
    if not db_campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    update_data = campaign_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_campaign, key, value)
    
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

# --- Steps CRUD ---

@router.post("/{campaign_id}/steps", response_model=CampaignStep)
def add_step(campaign_id: int, step: CampaignStepCreate, db: Session = Depends(get_db)):
    campaign = db.query(CampaignModel).filter(CampaignModel.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    db_step = CampaignStepModel(**step.model_dump(), campaign_id=campaign_id)
    db.add(db_step)
    db.commit()
    db.refresh(db_step)
    return db_step

@router.delete("/{campaign_id}/steps/{step_id}")
def delete_step(campaign_id: int, step_id: int, db: Session = Depends(get_db)):
    step = db.query(CampaignStepModel).filter(CampaignStepModel.id == step_id, CampaignStepModel.campaign_id == campaign_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
        
    db.delete(step)
    db.commit()
    return {"status": "success"}

@router.put("/{campaign_id}/steps/{step_id}", response_model=CampaignStep)
def update_step(campaign_id: int, step_id: int, step_update: CampaignStepUpdate, db: Session = Depends(get_db)):
    db_step = db.query(CampaignStepModel).filter(CampaignStepModel.id == step_id, CampaignStepModel.campaign_id == campaign_id).first()
    if not db_step:
        raise HTTPException(status_code=404, detail="Step not found")
        
    update_data = step_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_step, key, value)
    
    db.commit()
    db.refresh(db_step)
    return db_step

# --- Leads Management ---

@router.post("/{campaign_id}/leads", response_model=int)
def search_and_add_leads(campaign_id: int, lead_ids: List[int], db: Session = Depends(get_db)):
    """
    Adds multiple leads to a campaign. Returns count of added leads.
    """
    campaign = db.query(CampaignModel).options(joinedload(CampaignModel.steps)).filter(CampaignModel.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Get first step
    # Sort just in case logic needs it, though relationship might not be ordered.
    steps = sorted(campaign.steps, key=lambda s: s.order)
    first_step_id = steps[0].id if steps else None

    count = 0
    for lid in lead_ids:
        # Check if already exists
        exists = db.query(CampaignLeadModel).filter(CampaignLeadModel.campaign_id == campaign_id, CampaignLeadModel.lead_id == lid).first()
        if not exists:
            # Create new CampaignLead entry
            # In a real system, we'd calculate 'next_run_at' based on schedule. For now, immediate.
            cl = CampaignLeadModel(
                campaign_id=campaign_id,
                lead_id=lid,
                status="active",
                current_step_id=first_step_id
                # next_run_at = now or schedule
            )
            db.add(cl)
            count += 1
            
    db.commit()
    return count

@router.post("/{campaign_id}/launch", response_model=Campaign)
def launch_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(CampaignModel).options(joinedload(CampaignModel.steps)).filter(CampaignModel.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    if not campaign.steps:
        raise HTTPException(status_code=400, detail="Cannot launch campaign with no steps")
        
    campaign.status = "active"
    db.commit()
    db.refresh(campaign)
    return campaign

@router.post("/test-run", response_model=dict)
def trigger_campaign_processing(db: Session = Depends(get_db)):
    """
    Manually triggers the Campaign Runner to process all active campaigns.
    Useful for debugging or immediate execution.
    """
    try:
        runner = CampaignRunner(db)
        results = runner.process_campaigns()
        return results
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        traceback.print_exc()
        return {"error": str(e), "traceback": traceback.format_exc()}
