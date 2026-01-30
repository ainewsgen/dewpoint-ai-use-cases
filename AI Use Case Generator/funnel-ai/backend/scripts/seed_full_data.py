import sys
import os
import random
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import engine, Base, SessionLocal
from app.models.lead import Lead
from app.models.campaign import Campaign, CampaignStep, CampaignLead
from app.models.pipeline import Stage, Deal
from app.models.task import Task
from app.models.user import User
from app.models.brand import BrandSettings
from app.models.template import MessageTemplate

def seed_data():
    db = SessionLocal()
    try:
        print("Starting data seed...")

        # 1. Reset Database (Ensure Schema Matches Models)
        print("Dropping existing tables to fix schema consistency...")
        Base.metadata.drop_all(bind=engine)
        print("Creating tables...")
        Base.metadata.create_all(bind=engine)

        # 2. Seed User & Brand
        user = db.query(User).filter(User.email == "admin@funnel.ai").first()
        if not user:
            print("Creating Admin User...")
            user = User(
                email="admin@funnel.ai",
                full_name="Admin User",
                business_type="b2b"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        brand = db.query(BrandSettings).filter(BrandSettings.user_id == user.id).first()
        if not brand:
            print("Creating Brand Settings...")
            brand = BrandSettings(user_id=user.id, tone_value=75, brand_voice="Professional and authoritative")
            db.add(brand)
            db.commit()

        # Seed Templates (Needed for Campaigns)
        if db.query(MessageTemplate).count() == 0:
            print("Seeding Templates...")
            t1 = MessageTemplate(name="Intro Cold Email", type="email", subject="Question about {company}", body="Hi {first_name}, ...")
            t2 = MessageTemplate(name="Follow Up", type="email", subject="Re: Question", body="Just bumping this...")
            db.add_all([t1, t2])
            db.commit()

        # 3. Seed Leads
        # Check if we already have a bunch of leads
        if db.query(Lead).count() < 10:
            print("Seeding Leads...")
            leads_data = [
                {"first_name": "Alice", "last_name": "Johnson", "email": "alice@techcorp.com", "company": "TechCorp", "title": "CTO", "status": "new", "score": 85},
                {"first_name": "Bob", "last_name": "Smith", "email": "bob@innovate.io", "company": "Innovate IO", "title": "VP Sales", "status": "contacted", "score": 60},
                {"first_name": "Carol", "last_name": "Williams", "email": "carol@enterprise.net", "company": "Enterprise Net", "title": "CEO", "status": "qualified", "score": 95},
                {"first_name": "David", "last_name": "Brown", "email": "david@startup.co", "company": "Startup Co", "title": "Founder", "status": "new", "score": 40},
                {"first_name": "Eva", "last_name": "Davis", "email": "eva@bigdata.inc", "company": "BigData Inc", "title": "Head of Engineering", "status": "contacted", "score": 75},
                {"first_name": "Frank", "last_name": "Miller", "email": "frank@logistics.com", "company": "Fast Logistics", "title": "Ops Manager", "status": "lost", "score": 20},
                {"first_name": "Grace", "last_name": "Hopper", "email": "grace@navy.mil", "company": "US Navy", "title": "Admiral", "status": "qualified", "score": 99},
                {"first_name": "Henry", "last_name": "Ford", "email": "henry@motors.com", "company": "Ford Motors", "title": "Founder", "status": "contacted", "score": 55},
                {"first_name": "Ivy", "last_name": "League", "email": "ivy@edu.org", "company": "Education Org", "title": "Dean", "status": "new", "score": 30},
                {"first_name": "Jack", "last_name": "Ripper", "email": "jack@london.uk", "company": "Unknown", "title": "Freelancer", "status": "lost", "score": 10},
            ]
            for data in leads_data:
                lead = Lead(**data)
                db.add(lead)
            db.commit()

        # 4. Seed Campaigns
        if db.query(Campaign).count() == 0:
            print("Seeding Campaigns...")
            # Active Campaign
            camp1 = Campaign(name="Q1 Outback Outreach", status="active", type="email", sent_count=150, open_count=80, reply_count=20)
            db.add(camp1)
            db.commit()
            db.refresh(camp1)

            # Steps for Camp1
            step1 = CampaignStep(campaign_id=camp1.id, order=1, step_type="email", name="Intro Email", content_instruction="Discuss synergy")
            step2 = CampaignStep(campaign_id=camp1.id, order=2, step_type="delay", wait_days=2, name="Wait 2 Days")
            step3 = CampaignStep(campaign_id=camp1.id, order=3, step_type="email", name="Follow Up", content_instruction="Just bumping this")
            db.add_all([step1, step2, step3])
            db.commit()

            # Enrolling Leads in Camp1
            active_Leads = db.query(Lead).filter(Lead.status.in_(["new", "contacted"])).limit(3).all()
            for i, lead in enumerate(active_Leads):
                # Lead 1 at step 1, Lead 2 at step 3
                current_step = step1 if i % 2 == 0 else step3
                cl = CampaignLead(campaign_id=camp1.id, lead_id=lead.id, status="active", current_step_id=current_step.id)
                db.add(cl)
            
            # Draft Campaign
            camp2 = Campaign(name="Test Campaign Draft", status="draft", type="linkedin")
            db.add(camp2)
            db.commit()

        # 5. Seed Pipeline Stages
        if db.query(Stage).count() == 0:
            print("Seeding Stages...")
            stages = [
                Stage(name="Discovery", order=1, color="blue"),
                Stage(name="Proposal", order=2, color="yellow"),
                Stage(name="Negotiation", order=3, color="orange"),
                Stage(name="Closed Won", order=4, color="green"),
                Stage(name="Closed Lost", order=5, color="red")
            ]
            db.add_all(stages)
            db.commit()

        # 6. Seed Deals
        if db.query(Deal).count() == 0:
            print("Seeding Deals...")
            stages = {s.name: s.id for s in db.query(Stage).all()}
            qualified_leads = db.query(Lead).filter(Lead.status == "qualified").all()
            
            for i, lead in enumerate(qualified_leads):
                deal = Deal(
                    title=f"{lead.company} Contract",
                    value=random.randint(5000, 50000),
                    stage_id=stages["Proposal"] if i % 2 == 0 else stages["Negotiation"],
                    lead_id=lead.id,
                    expected_close_date=datetime.now() + timedelta(days=random.randint(10, 30))
                )
                db.add(deal)
            db.commit()

        # 7. Seed Tasks
        if db.query(Task).count() == 0:
            print("Seeding Tasks...")
            deals = db.query(Deal).all()
            # Task for a Deal
            if deals:
                task1 = Task(title="Send Contract", type="email", priority="high", deal_id=deals[0].id, due_date=datetime.now() + timedelta(days=1))
                db.add(task1)
            
            # Task for a Lead
            leads = db.query(Lead).all()
            if leads:
                task2 = Task(title="Initial Call", type="call", priority="medium", lead_id=leads[0].id, due_date=datetime.now() - timedelta(days=1)) # Overdue
                db.add(task2)

            # General Task
            task3 = Task(title="Update Q2 Goals", type="todo", priority="low", due_date=datetime.now() + timedelta(days=5))
            db.add(task3)
            
            db.commit()

        print("Data Seeding Completed Successfully!")

    except Exception as e:
        print(f"Error seeding data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
