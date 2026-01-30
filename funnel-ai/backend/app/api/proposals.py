from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.session import get_db
from ..models.proposal import Proposal
from ..models.lead import Lead
from ..services.pdf_generator import generate_proposal_pdf
from pydantic import BaseModel
from datetime import datetime
import os

router = APIRouter()

class ProposalCreate(BaseModel):
    title: str
    content: str
    amount: float
    lead_id: int
    deal_id: Optional[int] = None

class ProposalRead(BaseModel):
    id: int
    title: str
    status: str
    amount: float
    pdf_path: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

@router.post("/", response_model=ProposalRead)
def create_proposal(prop: ProposalCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Verify lead exists
    lead = db.query(Lead).filter(Lead.id == prop.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db_prop = Proposal(**prop.model_dump())
    db.add(db_prop)
    db.commit()
    db.refresh(db_prop)
    
    # Generate PDF in background
    background_tasks.add_task(generate_and_save_pdf, db_prop.id, db_prop.title, db_prop.content, db_prop.amount, db)
    
    return db_prop

def generate_and_save_pdf(prop_id: int, title: str, content: str, amount: float, db: Session):
    # Re-acquire session if needed or pass existing (be careful with threading)
    # For MVP, we'll assume the simple function is safe or just update DB
    # Note: Passed DB session might be closed, safer to create new one or handle carefully.
    # We will generate file path and update:
    
    path = generate_proposal_pdf(prop_id, title, content, amount)
    
    # Update DB (Hack for MVP: creating new session here to avoid thread issues with dependency injection)
    from ..db.session import SessionLocal
    with SessionLocal() as session:
        p = session.query(Proposal).filter(Proposal.id == prop_id).first()
        if p:
            p.pdf_path = path
            session.commit()

@router.get("/", response_model=List[ProposalRead])
def read_proposals(db: Session = Depends(get_db)):
    return db.query(Proposal).order_by(Proposal.created_at.desc()).all()

@router.get("/{proposal_id}/download")
def download_proposal(proposal_id: int, db: Session = Depends(get_db)):
    prop = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not prop or not prop.pdf_path:
        raise HTTPException(status_code=404, detail="Proposal PDF not found")
    
    return FileResponse(prop.pdf_path, media_type='application/pdf', filename=f"proposal_{proposal_id}.pdf")
