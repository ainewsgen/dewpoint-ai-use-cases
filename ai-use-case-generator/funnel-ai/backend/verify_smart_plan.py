import urllib.request
import json
import sqlite3
import datetime
import os

# DB is in same dir
DB_PATH = "sql_app.db"
API_URL = "http://localhost:8000/api"

def run():
    # 1. Create Lead
    print("Creating Lead...")
    data = {
        "first_name": "Old", "last_name": "Timer", 
        "email": f"old.timer.{datetime.datetime.now().timestamp()}@example.com",
        "company": "History Inc", "title": "VP History"
    }
    req = urllib.request.Request(f"{API_URL}/leads/", 
        data=json.dumps(data).encode('utf-8'), 
        headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            lead = json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Failed to create lead: {e.read().decode()}")
        return

    lead_id = lead['id']
    print(f"Lead ID: {lead_id}")

    # 2. Update DB manually
    print("Updating DB...")
    # Using absolute path assumption or relative if running from backend dir
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    # Set last_contacted_at to 40 days ago, score to 65, status to 'contacted'
    past_date = (datetime.datetime.now() - datetime.timedelta(days=40)).strftime('%Y-%m-%d %H:%M:%S')
    cur.execute("UPDATE leads SET last_contacted_at = ?, score = 65, status = 'contacted' WHERE id = ?", (past_date, lead_id))
    conn.commit()
    conn.close()

    # 3. Generate Tasks
    print("Generating Tasks...")
    req = urllib.request.Request(f"{API_URL}/ai/generate-tasks", method='POST', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        tasks = json.loads(response.read().decode())
    
    # 4. Check for our lead
    found = False
    for t in tasks:
        if t.get('lead_id') == lead_id:
            print(f"Found Prediction: {t['title']} | Reason: {t['reason']} | Priority: {t['priority']}")
            found = True
    
    if not found:
        print("Lead not found in suggestions.")
        # print("Suggestions:", tasks) # Too noisy

if __name__ == "__main__":
    run()
