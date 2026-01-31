import sqlite3
import os

# Adjust path if needed. Assuming running from root or backend.
db_path = 'backend/sql_app.db'
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}, trying sql_app.db")
    db_path = 'sql_app.db'

print(f"Connecting to {db_path}...")
conn = sqlite3.connect(db_path)
c = conn.cursor()

columns = [
    ("disqualification_reason", "VARCHAR"),
    ("disqualified_at", "TIMESTAMP")
]

for col, dtype in columns:
    try:
        print(f"Adding column {col}...")
        c.execute(f"ALTER TABLE leads ADD COLUMN {col} {dtype}")
        print("Done.")
    except Exception as e:
        print(f"Error adding {col}: {e}")

conn.commit()
conn.close()
