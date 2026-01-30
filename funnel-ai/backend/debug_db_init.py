
import sys
import os

sys.path.append(os.getcwd())

try:
    from app.db.session import engine, Base
    from app.models.campaign import Campaign, CampaignStep, CampaignLead
    from app.models.lead import Lead
    from app.models.task import Task
    from app.models.brand import BrandSettings
    from app.models.user import User
    from app.models.crm import FollowUp, LeadNote, Deal
    print("All Models imported.")
    
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")
    
    # Seed Data
    from sqlalchemy.orm import Session
    db = Session(bind=engine)
    
    # User
    if not db.query(User).filter(User.id == 1).first():
        print("Seeding User...")
        user = User(id=1, email="admin@funnel.ai", full_name="Admin", business_type="b2b")
        db.add(user)
    
    # Brand Settings
    if not db.query(BrandSettings).first():
        print("Seeding Brand Settings...")
        settings = BrandSettings(user_id=1, tone="professional")
        db.add(settings)
        
    db.commit()
    print("Seeding Complete.")
except Exception as e:
    import traceback
    traceback.print_exc()
