from app.db.session import SessionLocal, engine, Base
from app.models.plan import Plan

# Create tables
Base.metadata.create_all(bind=engine)

def check_plans():
    db = SessionLocal()
    try:
        plans = db.query(Plan).all()
        print(f"Plans found: {len(plans)}")
        for p in plans:
            print(f"- {p.name}: {p.price}")
            
        if not plans:
            print("Seeding...")
            db.add(Plan(name="Test Plan", price=10.0, features={}))
            db.commit()
            print("Seeded test plan.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_plans()
