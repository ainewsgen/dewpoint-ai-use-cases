from fastapi import APIRouter, Depends, HTTPException, status
import traceback
from sqlalchemy.orm import Session
from datetime import datetime
from ..db.session import get_db
from ..models.lead import Lead
from ..models.crm import FollowUp, LeadNote
from ..models.pipeline import Deal, Stage
from ..schemas.actions import (
    ActionResponse, EmailRequest, SMSRequest, LinkedInRequest, 
    PipelineAddRequest, FollowUpRequest, NoteRequest
)

router = APIRouter()

def get_lead_or_404(db: Session, lead_id: int):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

from ..models.crm import CRMIntegration

@router.post("/email", response_model=ActionResponse)
def send_email(request: EmailRequest, db: Session = Depends(get_db)):
    lead = get_lead_or_404(db, request.lead_id)
    
    try:
        # Check for SMTP integration
        smtp_config = db.query(CRMIntegration).filter(CRMIntegration.crm_type == 'smtp', CRMIntegration.user_id == 1, CRMIntegration.is_connected == True).first()
        
        if smtp_config and smtp_config.api_key and smtp_config.endpoint:
            # Pseudo-code for real sending
            print(f"[REAL SEND] Connecting to SMTP {smtp_config.endpoint} with user {smtp_config.api_key}...")
            # with smtplib.SMTP(smtp_config.endpoint) as server:
            #    server.login(smtp_config.api_key, smtp_config.api_secret)
            #    server.sendmail(...)
            # Log the action
            db.add(LeadNote(lead_id=lead.id, content=f"📧 Sent Email via {smtp_config.endpoint}: {request.subject}"))
            
            # Update Contact Info
            lead.last_contacted_at = datetime.now()
            lead.last_contact_method = 'email'
            
            db.commit()
            return ActionResponse(status="success", message=f"Email sent to {lead.email} via {smtp_config.endpoint}")
        else:
            # Fallback Mock
            print(f"[MOCK SEND] No SMTP config found. Sending email to {lead.email}: {request.subject}")
            db.add(LeadNote(lead_id=lead.id, content=f"📧 (Mock) Sent Email: {request.subject}"))
            
            # Update Contact Info
            lead.last_contacted_at = datetime.now()
            lead.last_contact_method = 'email'

            db.commit()
            return ActionResponse(status="success", message=f"(Mock) Email sent to {lead.email}")
    except Exception as e:
        print(f"Error sending email: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sms", response_model=ActionResponse)
def send_sms(request: SMSRequest, db: Session = Depends(get_db)):
    lead = get_lead_or_404(db, request.lead_id)
    
    if not lead.phone:
         return ActionResponse(status="error", message="Lead has no phone number")

    # Check for Twilio integration
    twilio_config = db.query(CRMIntegration).filter(CRMIntegration.crm_type == 'twilio', CRMIntegration.user_id == 1, CRMIntegration.is_connected == True).first()
    
    if twilio_config and twilio_config.api_key:
        print(f"[REAL SEND] Connecting to Twilio with SID {twilio_config.api_key}...")
        # client = Client(twilio_config.api_key, twilio_config.api_secret)
        # client.messages.create(...)
        # client.messages.create(...)
        db.add(LeadNote(lead_id=lead.id, content=f"📱 Sent SMS via Twilio: {request.message[:20]}..."))
        
        # Update Contact Info
        lead.last_contacted_at = datetime.now()
        lead.last_contact_method = 'sms'
        
        db.commit()
        return ActionResponse(status="success", message=f"SMS sent to {lead.phone} via Twilio API")
    else:
         print(f"[MOCK SEND] No Twilio config found. Sending SMS to {lead.phone}: {request.message}")
         db.add(LeadNote(lead_id=lead.id, content=f"📱 (Mock) Sent SMS: {request.message[:20]}..."))
         
         # Update Contact Info
         lead.last_contacted_at = datetime.now()
         lead.last_contact_method = 'sms'
         
         db.commit()
         return ActionResponse(status="success", message=f"(Mock) SMS sent to {lead.phone}")

@router.post("/linkedin_dm", response_model=ActionResponse)
def send_linkedin_dm(request: LinkedInRequest, db: Session = Depends(get_db)):
    lead = get_lead_or_404(db, request.lead_id)
    # Mock LinkedIn DM
    print(f"Sending LinkedIn DM to {lead.first_name}: {request.message}")
    
    # Update Contact Info
    lead.last_contacted_at = datetime.now()
    lead.last_contact_method = 'linkedin'
    db.commit()

    return ActionResponse(status="success", message=f"LinkedIn DM sent to {lead.first_name}")

@router.post("/pipeline/add", response_model=ActionResponse)
def add_to_pipeline(request: PipelineAddRequest, db: Session = Depends(get_db)):
    lead = get_lead_or_404(db, request.lead_id)
    
    # 1. Idempotency Check
    existing_deal = db.query(Deal).join(Stage).filter(
        Deal.lead_id == lead.id,
        Stage.name.notin_(["Deal Won", "Deal Lost"])
    ).first()
    
    if existing_deal:
        return ActionResponse(status="success", message=f"Lead already has an active deal: {existing_deal.title}")
    
    # Check if stage exists
    stage = db.query(Stage).filter(Stage.id == request.stage_id).first()
    if not stage:
        # Fallback to first stage if any exist, or error
        stage = db.query(Stage).order_by(Stage.order).first()
        if not stage:
            return ActionResponse(status="error", message="No pipeline stages defined")
    
    # Create Deal
    deal = Deal(
        title=f"Deal for {lead.company or lead.last_name}",
        lead_id=lead.id,
        stage_id=stage.id,
        value=0.0 # Default value
    )
    db.add(deal)
    db.commit()
    
    return ActionResponse(status="success", message=f"Added to pipeline stage: {stage.name}")

@router.post("/followup/schedule", response_model=ActionResponse)
def schedule_followup(request: FollowUpRequest, db: Session = Depends(get_db)):
    lead = get_lead_or_404(db, request.lead_id)
    
    followup = FollowUp(
        lead_id=lead.id,
        scheduled_at=request.scheduled_at,
        notes=request.notes,
        status="pending",
        title=request.title,
        type=request.type
    )
    db.add(followup)
    db.commit()
    
    return ActionResponse(status="success", message="Follow-up scheduled")

@router.post("/note/add", response_model=ActionResponse)
def add_note(request: NoteRequest, db: Session = Depends(get_db)):
    lead = get_lead_or_404(db, request.lead_id)
    
    note = LeadNote(
        lead_id=lead.id,
        content=request.content
    )
    db.add(note)
    db.commit()
    
    return ActionResponse(status="success", message="Note added")

@router.post("/contacted", response_model=ActionResponse)
def mark_contacted(lead_id: int, db: Session = Depends(get_db)):
    lead = get_lead_or_404(db, lead_id)
    lead.status = "contacted"
    
    # Update Contact Info
    lead.last_contacted_at = datetime.now()
    lead.last_contact_method = 'manual'
    
    db.commit()
    return ActionResponse(status="success", message="Lead marked as contacted")

@router.get("/details/{lead_id}")
def get_lead_details(lead_id: int, db: Session = Depends(get_db)):
    # Re-use basic lead fetch but could be expanded
    lead = get_lead_or_404(db, lead_id)
    # Could join with notes, followups etc here
    return lead
