
import sqlite3
import os

# Path to the database
DB_PATH = os.path.join(os.path.dirname(__file__), "../sql_app.db")

def migrate():
    print(f"Migrating database at {DB_PATH}...")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns exist
        cursor.execute("PRAGMA table_info(leads)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "last_contacted_at" not in columns:
            print("Adding last_contacted_at column...")
            cursor.execute("ALTER TABLE leads ADD COLUMN last_contacted_at DATETIME")
            
        if "last_contact_method" not in columns:
            print("Adding last_contact_method column...")
            cursor.execute("ALTER TABLE leads ADD COLUMN last_contact_method VARCHAR")
            
        # Check crm_integrations columns
        cursor.execute("PRAGMA table_info(crm_integrations)")
        crm_columns = [info[1] for info in cursor.fetchall()]
        
        if "api_key" not in crm_columns:
            print("Adding api_key column to crm_integrations...")
            cursor.execute("ALTER TABLE crm_integrations ADD COLUMN api_key TEXT")
            
        if "api_secret" not in crm_columns:
             print("Adding api_secret column to crm_integrations...")
             cursor.execute("ALTER TABLE crm_integrations ADD COLUMN api_secret TEXT")
             
        if "endpoint" not in crm_columns:
             print("Adding endpoint column to crm_integrations...")
             cursor.execute("ALTER TABLE crm_integrations ADD COLUMN endpoint TEXT")
            
        conn.commit()
        print("Migration successful!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
