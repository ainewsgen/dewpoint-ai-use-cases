from app.db.session import engine
from app.models.crm import CRMIntegration
from sqlalchemy import text

def reset_table():
    print("Dropping crm_integrations table...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS crm_integrations"))
        conn.commit()
    print("Table dropped. Restart the backend to recreate it with new schema.")

if __name__ == "__main__":
    reset_table()
