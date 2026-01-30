import sys
import os
from datetime import datetime

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.session import SessionLocal
from app.services.campaign_service import handle_email_reply
from app.models.campaign import Campaign, CampaignStep, CampaignLead
from app.models.pipeline import Deal
from app.models.lead import Lead
from app.models.task import Task

def test_email_reply_flow():
    db = SessionLocal()
    
    print("--- SETUP TEST DATA ---")
    
    # 1. Create a Test Lead
    lead_email = f"test_reply_{int(datetime.now().timestamp())}@example.com"
    lead = Lead(
        first_name="Test",
        last_name="Reply",
        email=lead_email,
        company="Test Corp",
        status="new"
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    print(f"Created Lead: {lead.email}")
    
    # 2. Create a Test Campaign
    campaign = Campaign(name="Test Reply Campaign", status="active")
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # 3. Create a Step with Branch Config
    # Step 1: Email
    step1 = CampaignStep(
        campaign_id=campaign.id,
        order=1,
        name="Intro Email",
        step_type="email",
        content_instruction="Say hello",
        branch_config={
            "positive_sentiment": "create_task",
            "negative_sentiment": "disqualify"
        }
    )
    db.add(step1)
    db.commit()
    db.refresh(step1)
    
    # 4. Add Lead to Campaign (Active)
    campaign_lead = CampaignLead(
        campaign_id=campaign.id,
        lead_id=lead.id,
        status="active",
        current_step_id=step1.id,
        last_run_at=datetime.now()
    )
    db.add(campaign_lead)
    db.commit()
    
    print("--- TESTING POSITIVE REPLY ---")
    
    # 5. Simulate Positive Reply
    handle_email_reply(db, lead_email, "I am very interested! Please tell me more.", "Re: Question")
    
    # Verify
    db.refresh(campaign_lead)
    print(f"Campaign Lead Status (Expected 'replied' or 'paused'): {campaign_lead.status}")
    
    # Check for Task
    task = db.query(Task).filter(Task.lead_id == lead.id).order_by(Task.created_at.desc()).first()
    if task:
        print(f"Task Created: {task.title} - {task.description}")
    else:
        print("ERROR: No task created for positive reply.")
        
    print("--- TESTING NEGATIVE REPLY ---")
    # Reset for negative test (create new lead/scenario for cleanliness)
    lead_neg_email = f"test_neg_{int(datetime.now().timestamp())}@example.com"
    lead_neg = Lead(first_name="Neg", last_name="Test", email=lead_neg_email, company="No Corp")
    db.add(lead_neg)
    db.commit()
    
    campaign_lead_neg = CampaignLead(
        campaign_id=campaign.id,
        lead_id=lead_neg.id,
        status="active",
        current_step_id=step1.id,
        last_run_at=datetime.now()
    )
    db.add(campaign_lead_neg)
    db.commit()
    
    # Simulate Negative Reply
    handle_email_reply(db, lead_neg_email, "Stop emailing me. Unsubscribe.", "Re: Question")
    
    db.refresh(campaign_lead_neg)
    print(f"Campaign Lead Status (Expected 'disqualified'): {campaign_lead_neg.status}")
    
    if campaign_lead_neg.status == "disqualified":
        print("SUCCESS: Negative reply handled correctly.")
    else:
        print(f"FAILURE: Expected disqualified, got {campaign_lead_neg.status}")

    db.close()

if __name__ == "__main__":
    try:
        test_email_reply_flow()
    except Exception as e:
        print(f"TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
