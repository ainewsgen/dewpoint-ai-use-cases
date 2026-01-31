import sys
import os

# Add updated path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.pipeline import Deal, Stage
from app.models.lead import Lead as LeadModel # Ensure registry knows Lead
from app.models.task import Task # Ensure registry knows Task

def fix_orphaned_deals():
    db = SessionLocal()
    try:
        # Find Cold stage
        cold_stage = db.query(Stage).filter(Stage.name == "Cold").first()
        if not cold_stage:
            print("Cold stage not found, creating it...")
            cold_stage = Stage(name="Cold", order=0, color="slate")
            db.add(cold_stage)
            db.commit()
            db.refresh(cold_stage)
            
        # Find orphaned deals
        orphans = db.query(Deal).filter(Deal.stage_id == None).all()
        print(f"Found {len(orphans)} orphaned deals.")
        
        for deal in orphans:
            print(f"Assigning Deal '{deal.title}' (ID {deal.id}) to Cold stage (ID {cold_stage.id})")
            deal.stage_id = cold_stage.id
            
        db.commit()
        print("Fix complete.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_orphaned_deals()
