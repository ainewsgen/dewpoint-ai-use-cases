from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.session import get_db
from ..models.pipeline import Stage, Deal
from ..schemas.lead import Lead  # Import Lead schema
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# --- Schemas ---
class StageBase(BaseModel):
    name: str
    order: int
    color: str = "blue"

class StageCreate(StageBase):
    pass

class StageRead(StageBase):
    id: int
    class Config:
        from_attributes = True

class DealBase(BaseModel):
    title: str
    value: float = 0.0
    stage_id: int
    lead_id: Optional[int] = None

class DealCreate(DealBase):
    pass

class DealRead(DealBase):
    id: int
    currency: str
    created_at: datetime
    lead: Optional[Lead] = None  # Include full lead details

    class Config:
        from_attributes = True

# --- Routes ---

@router.post("/stages/init")
def init_default_stages(db: Session = Depends(get_db)):
    """Initialize default stages from spec and cleanup old ones"""
    # New Standard Flow
    defaults = [
        {"name": "Cold", "order": 0, "color": "slate"},
        {"name": "Qualified", "order": 1, "color": "blue"},
        {"name": "Meeting Scheduled", "order": 2, "color": "indigo"},
        {"name": "Initial Meeting", "order": 3, "color": "purple"},
        {"name": "Proposal", "order": 4, "color": "orange"},
        {"name": "Negotiation", "order": 5, "color": "yellow"},
        {"name": "Deal Won", "order": 6, "color": "green"},
        {"name": "Deal Lost", "order": 7, "color": "red"},
    ]
    
    # 1. Ensure "Cold" exists first as fallback
    cold_stage = db.query(Stage).filter(Stage.name == "Cold").first()
    if not cold_stage:
        cold_stage = Stage(name="Cold", order=0, color="slate")
        db.add(cold_stage)
        db.commit()
        db.refresh(cold_stage)

    # 2. Create/Update desired stages
    valid_names = [d["name"] for d in defaults]
    for d in defaults:
        stage = db.query(Stage).filter(Stage.name == d["name"]).first()
        if not stage:
            stage = Stage(**d)
            db.add(stage)
        else:
            # Update attributes if needed (order/color)
            stage.order = d["order"]
            stage.color = d["color"]
    db.commit()

    # 3. Cleanup: Move deals from invalid stages to Cold, then delete invalid stages
    all_stages = db.query(Stage).all()
    deleted_count = 0
    
    for stage in all_stages:
        if stage.name not in valid_names:
            # Move deals to Cold
            deals_to_move = db.query(Deal).filter(Deal.stage_id == stage.id).all()
            for deal in deals_to_move:
                deal.stage_id = cold_stage.id
            
            # Delete stage
            db.delete(stage)
            deleted_count += 1
            
    db.commit()
    return {"message": f"Pipeline updated. {deleted_count} old stages removed. Deals moved to 'Cold'."}

@router.get("/stages", response_model=List[StageRead])
def read_stages(db: Session = Depends(get_db)):
    return db.query(Stage).order_by(Stage.order).all()

from sqlalchemy.orm import joinedload

@router.get("/deals", response_model=List[DealRead])
def read_deals(db: Session = Depends(get_db)):
    # Join with Lead to ensure efficient loading
    return db.query(Deal).options(joinedload(Deal.lead)).all()

@router.post("/deals", response_model=DealRead)
def create_deal(deal: DealCreate, db: Session = Depends(get_db)):
    
    # 1. Idempotency Check: Prevent multiple active deals for the same lead
    if deal.lead_id:
        existing_deal = db.query(Deal).join(Stage).filter(
            Deal.lead_id == deal.lead_id,
            Stage.name.notin_(["Deal Won", "Deal Lost"]) # Assuming active stages
        ).first()
        
        if existing_deal:
             print(f"[DEBUG] duplicate deal prevented for lead {deal.lead_id}")
             # Ensure lead is loaded for return
             db.refresh(existing_deal)
             return existing_deal

    db_deal = Deal(**deal.model_dump())
    db.add(db_deal)
    db.commit()
    db.refresh(db_deal)
    # Eager load lead for response structure
    if db_deal.lead_id:
        db.refresh(db_deal, attribute_names=['lead'])
        
    return db_deal

@router.put("/deals/{deal_id}/move")
def move_deal(deal_id: int, stage_id: int = Body(..., embed=True), db: Session = Depends(get_db)):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    deal.stage_id = stage_id
    db.commit()
    db.refresh(deal)
    
    # Trigger Notification for "Close" stage
    target_stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if target_stage and target_stage.name in ["Close", "Won", "Closed Won"]:
        from ..models.notification import Notification
        notif = Notification(
            type="success",
            title="Deal Closed!",
            message=f"Deal '{deal.title}' valued at ${deal.value:,.2f} has been closed."
        )
        db.add(notif)
        db.commit()
        
@router.put("/deals/{deal_id}", response_model=DealRead)
def update_deal(deal_id: int, deal_update: DealCreate, db: Session = Depends(get_db)):
    db_deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not db_deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    update_data = deal_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_deal, key, value)
        
    db.commit()
    db.refresh(db_deal)
    # Ensure lead is loaded
    if db_deal.lead_id:
        db.refresh(db_deal, attribute_names=['lead'])
    return db_deal
