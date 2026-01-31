from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from ..db.session import get_db
from ..models.crm import FollowUp, LeadNote
from ..models.lead import Lead

router = APIRouter()

@router.get("/")
def get_notifications(db: Session = Depends(get_db)):
    """
    Get system notifications/alerts, primarily due follow-ups.
    """
    alerts = []
    
    # Check for overdue or due today follow-ups
    now = datetime.now()
    pending_followups = db.query(FollowUp).join(Lead).filter(
        FollowUp.status == 'pending',
        FollowUp.is_dismissed == False
    ).all()
    
    for f in pending_followups:
        time_diff = (f.scheduled_at - now).total_seconds()
        
        # If overdue (negative time_diff) or due within next 24 hours
        if time_diff < 0:
            alerts.append({
                "id": f.id,
                "type": "overdue_task",
                "severity": "high",
                "message": f"Overdue: Follow up with {f.lead.first_name} {f.lead.last_name}",
                "context_id": f.lead_id,
                "timestamp": f.scheduled_at
            })
        elif time_diff < 86400: # 24 hours
            alerts.append({
                "id": f.id,
                "type": "due_soon",
                "severity": "medium",
                "message": f"Due Today: Follow up with {f.lead.first_name} {f.lead.last_name}",
                "context_id": f.lead_id,
                "timestamp": f.scheduled_at
            })
            
    return alerts

@router.post("/{notification_id}/dismiss")
def dismiss_notification(notification_id: int, db: Session = Depends(get_db)):
    """
    Dismiss a notification (FollowUp alert).
    """
    followup = db.query(FollowUp).filter(FollowUp.id == notification_id).first()
    if not followup:
        # It's possible the notification ID doesn't directly map to a followup if we have other types later
        # For now, we assume ID matches FollowUp ID
        return {"status": "error", "message": "Notification not found"}
        
    followup.is_dismissed = True
    db.commit()
    return {"status": "success"}
