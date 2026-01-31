import sqlite3
import os

# Explicitly pointing to the restored DB
DB_PATH = "/Users/patchenuchiyama/Documents/Antigravity/funnel-ai/backend/sql_app_restored.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print(f"Attempting to add 'weekly_limit' column to 'plans' table in {DB_PATH}...")
        cursor.execute("ALTER TABLE plans ADD COLUMN weekly_limit INTEGER DEFAULT 0")
        conn.commit()
        print("Success: Column 'weekly_limit' added.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Info: Column 'weekly_limit' already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
