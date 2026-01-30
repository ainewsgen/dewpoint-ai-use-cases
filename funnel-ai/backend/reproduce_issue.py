import sys
import os

# Add current dir to path so we can import app modules
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.pipeline import Deal, Stage
from app.models.lead import Lead as LeadModel
from app.models.task import Task
from app.schemas.lead import Lead
from app.api.pipeline import DealRead

def test_deals_query():
    db = SessionLocal()
    try:
        deals = db.query(Deal).all()
        print(f"Found {len(deals)} deals.")
        for deal in deals:
            try:
                # Try to validate with Pydantic
                DealRead.model_validate(deal)
                print(f"Deal {deal.id} validated OK.")
            except Exception as e:
                print(f"Deal {deal.id} validation failed: {e}")
                # Print details
                print(f"Deal data: {deal.__dict__}")
                if deal.lead:
                    print(f"Lead data: {deal.lead.__dict__}")
                else:
                    print("Lead is None")
                raise e
    except Exception as e:
        print(f"Query failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_deals_query()
