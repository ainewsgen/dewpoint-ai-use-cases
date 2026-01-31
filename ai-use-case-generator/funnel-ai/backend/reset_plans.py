from app.db.session import SessionLocal, engine, Base
from app.models.plan import Plan

def reset_plans():
    db = SessionLocal()
    try:
        db.query(Plan).delete()
        db.commit()
        print("Plans deleted. API will auto-seed on next load.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_plans()
