from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db.session import get_db
from ..models.lead import Lead
from ..models.pipeline import Deal
from ..models.crm import FollowUp

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Total Leads
    total_leads = db.query(func.count(Lead.id)).scalar()

    # 2. Pipeline Value (Sum of all deal values)
    pipeline_value = db.query(func.sum(Deal.value)).scalar() or 0.0

    # 3. Pending Tasks
    pending_tasks = db.query(func.count(FollowUp.id)).filter(FollowUp.status == 'pending').scalar()

    return {
        "total_leads": total_leads,
        "pipeline_value": pipeline_value,
        "pending_tasks": pending_tasks
    }
