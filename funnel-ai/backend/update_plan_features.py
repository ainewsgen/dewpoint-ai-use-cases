from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.plan import Plan

def update_plans():
    db: Session = SessionLocal()
    try:
        plans = db.query(Plan).all()
        for plan in plans:
            features = dict(plan.features)
            
            # Logic: Starter gets limited tuning (False), others get True
            if plan.name == 'Starter':
                features['ai_tuning'] = False
            else:
                features['ai_tuning'] = True
            
            # Ensure other gating flags exist if missing
            if 'advanced_branding' not in features:
                features['advanced_branding'] = (plan.name != 'Starter')

            plan.features = features
            print(f"Updated {plan.name} features: ai_tuning={features['ai_tuning']}")
            
        db.commit()
        print("All plans updated successfully.")
    except Exception as e:
        print(f"Error updating plans: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_plans()
