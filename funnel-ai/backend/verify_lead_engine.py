import requests
import time
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def run_test(name, config):
    print(f"\n--- Starting Test: {name} ---")
    try:
        # 1. Start Lead Run
        print(f"Initiating run with config: {config}")
        resp = requests.post(f"{BASE_URL}/workspaces/1/lead-runs/", json={"config_override": config})
        if resp.status_code != 200:
            print(f"Failed to start run: {resp.text}")
            return

        run_id = resp.json()['id']
        print(f"Run started with ID: {run_id}")

        # 2. Poll
        status = "queued"
        while status not in ['completed', 'failed']:
            time.sleep(2)
            r = requests.get(f"{BASE_URL}/workspaces/1/lead-runs/{run_id}")
            data = r.json()
            status = data['status']
            print(f"Status: {status} | Stats: {data.get('stats')}")

        if status == 'completed':
            stats = data['stats']
            if stats and stats.get('leads_created', 0) > 0:
                print("SUCCESS: Leads created.")
            else:
                print("WARNING: Run completed but 0 leads created (maybe mock data matched existing?)")
        else:
            print(f"FAILURE: Run failed with error: {data.get('error')}")

    except Exception as e:
        print(f"Test Exception: {e}")

if __name__ == "__main__":
    # Test Path A: Discovery
    run_test("Path A (Discovery - Plumbers)", {
        "keywords": "Plumbers",
        "location": "Austin, TX",
        "platform": "google",
        "limit": 2
    })

    # Test Path B: Intent (Jobs)
    run_test("Path B (Intent - Software Engineer)", {
        "keywords": "Software Engineer", 
        "location": "Remote",
        "platform": "jobs", # Triggers _intent
        "limit": 2
    })
