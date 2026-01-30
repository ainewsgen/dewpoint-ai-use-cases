from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from ..db.session import get_db
from ..models.plan import Plan

router = APIRouter(tags=["plans"])

class PlanUpdate(BaseModel):
    price: float
    weekly_limit: int
    features: Dict[str, Any]

@router.get("/")
def get_plans(db: Session = Depends(get_db)):
    plans = db.query(Plan).filter(Plan.is_active == True).all()
    if not plans:
        # Auto-seed if empty
        seed_plans(db)
        plans = db.query(Plan).filter(Plan.is_active == True).all()
    return plans

@router.put("/{plan_id}")
def update_plan(plan_id: int, plan_update: PlanUpdate, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    plan.price = plan_update.price
    plan.weekly_limit = plan_update.weekly_limit
    plan.features = plan_update.features
    db.commit()
    db.refresh(plan)
    return plan

def seed_plans(db: Session):
    defaults = [
        {
            "name": "Starter",
            "description": "For individuals testing the waters.",
            "price": 0,
            "weekly_limit": 50,
            "features": {
                "lead_discovery": False,
                "ai_enrichment": False,
                "crm_sync": False,
                "smart_plan": False,
                "outreach": False,
                "proposals": False,
                "integrations": False,
                "enrich_all": False,
                "max_leads": 50
            }
        },
        {
            "name": "Pro",
            "description": "For power users and small teams.",
            "price": 49,
            "weekly_limit": 500,
            "features": {
                "lead_discovery": True,
                "ai_enrichment": True,
                "crm_sync": True,
                "smart_plan": True,
                "outreach": True,
                "proposals": True,
                "integrations": True,
                "enrich_all": True,
                "max_leads": 500
            }
        },
        {
            "name": "Enterprise",
            "description": "For scaling organizations.",
            "price": 199,
            "weekly_limit": 99999,
            "features": {
                "lead_discovery": True,
                "ai_enrichment": True,
                "crm_sync": True,
                "smart_plan": True,
                "outreach": True,
                "proposals": True,
                "integrations": True,
                "enrich_all": True,
                "max_leads": 99999
            }
        }
    ]
    
    for p_data in defaults:
        plan = Plan(**p_data)
        db.add(plan)
    db.commit()
