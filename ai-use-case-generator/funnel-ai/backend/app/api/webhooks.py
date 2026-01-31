from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.campaign_service import handle_email_reply

router = APIRouter()

class EmailReply(BaseModel):
    email: str
    body: str
    subject: str = None

@router.post("/email-reply")
def incoming_email_reply(reply: EmailReply, db: Session = Depends(get_db)):
    """
    Simulates an incoming email reply via webhook.
    """
    success = handle_email_reply(db, reply.email, reply.body, reply.subject)
    
    if not success:
        # In a real webhook we might still return 200 to acknowledge receipt
        # but here we return 404 to indicate no campaign found for testing.
        raise HTTPException(status_code=404, detail="No active campaign found for this lead or lead not found.")
        
    return {"status": "processed", "sentiment_action_taken": True}
