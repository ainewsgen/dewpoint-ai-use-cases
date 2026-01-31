from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel
from ..db.session import get_db
from ..services.lead_engine import LeadEngine
from ..models.lead_engine import LeadRun, LeadRunStatus

router = APIRouter()

class LeadRunCreate(BaseModel):
    preset_id: Optional[int] = None
    config_override: Optional[Dict[str, Any]] = None

@router.post("/")
def start_lead_run(
    run_data: LeadRunCreate, 
    background_tasks: BackgroundTasks,
    workspace_id: int = 1, # Default for MVP
    db: Session = Depends(get_db)
):
    engine = LeadEngine(db, user_id="system") # MVP user
    
    # Create the run record synchronously
    run = engine.start_run(
        preset_id=run_data.preset_id, 
        config_override=run_data.config_override,
        workspace_id=workspace_id
    )
    
    # Schedule the actual processing in background
    background_tasks.add_task(engine.process_run, run.id)
    
    return {
        "id": run.id,
        "status": run.status,
        "message": "Lead run started successfully"
    }

@router.get("/{run_id}")
def get_lead_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(LeadRun).get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run
