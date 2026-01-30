from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Any
from datetime import datetime
from ..db.session import get_db
from ..models.crm import FollowUp, LeadNote
from ..models.pipeline import Deal
from enum import Enum

router = APIRouter()

class ActivityType(str, Enum):
    NOTE = "note"
    FollowUp = "followup"
    DEAL = "deal"

@router.get("/{lead_id}")
def get_lead_history(lead_id: int, db: Session = Depends(get_db)):
    """
    Fetch aggregated history for a lead:
    - Notes (including auto-logged emails/SMS)
    - Follow-ups
    - Pipeline Deals
    Sorted by date desc.
    """
    history = []

    # 1. Fetch Notes
    notes = db.query(LeadNote).filter(LeadNote.lead_id == lead_id).all()
    for n in notes:
        history.append({
            "id": n.id,
            "type": "note",
            "content": n.content,
            "date": n.created_at,
            "icon": "FileEdit"
        })

    # 2. Fetch Follow-ups
    followups = db.query(FollowUp).filter(FollowUp.lead_id == lead_id).all()
    for f in followups:
        # Use title if available, else standard fallback
        desc = f.title if f.title else (f.notes or "Scheduled Follow-up")
        
        history.append({
            "id": f.id,
            "type": f.type or "followup", # use specific type like 'call', 'meeting'
            "content": f"{f.status.capitalize()} {f.type.capitalize()}: {desc}",
            "date": f.scheduled_at, 
            "status": f.status,
            "icon": "Calendar"
        })
        
    # 3. Fetch Deals
    deals = db.query(Deal).filter(Deal.lead_id == lead_id).all()
    for d in deals:
         history.append({
            "id": d.id,
            "type": "deal",
            "content": f"Deal created: {d.title} (${d.value})",
            "date": d.created_at,
            "icon": "Briefcase"
        })

    # Sort by date descending (newest first)
    history.sort(key=lambda x: x['date'] or datetime.min, reverse=True)
    
    return history
