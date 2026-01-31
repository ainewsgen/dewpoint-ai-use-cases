from app.db.session import SessionLocal
from app.models.user import User # Register User model
from app.models.crm import FollowUp
from app.models.lead import Lead
from datetime import datetime, timedelta

db = SessionLocal()

# Find a lead
lead = db.query(Lead).first()
if lead:
    # 1. Create an OVERDUE follow-up (1 hour ago)
    overdue = FollowUp(
        lead_id=lead.id,
        scheduled_at=datetime.now() - timedelta(hours=1),
        notes="Urgent: Call back about proposal",
        status="pending"
    )
    db.add(overdue)
    
    # 2. Create a FUTURE follow-up (tomorrow)
    future = FollowUp(
        lead_id=lead.id,
        scheduled_at=datetime.now() + timedelta(days=1),
        notes="Routine check-in",
        status="pending"
    )
    db.add(future)
    
    db.commit()
    print(f"Added follow-ups for lead {lead.first_name}")
else:
    print("No leads found")
    
db.close()
