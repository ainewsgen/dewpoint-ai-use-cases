
import requests
import time
import sys

BASE_URL = "http://localhost:8000/api"

def print_step(msg):
    print(f"\n--- {msg} ---")

def run_test():
    # 0. Create Lead
    print_step("0. Creating Lead")
    try:
        lead_res = requests.post(f"{BASE_URL}/leads/", json={
            "first_name": "Test", "last_name": "User", "company": "Acme Inc", "email": "test@acme.com", "status": "new"
        })
        if lead_res.status_code == 200:
            lead_id = lead_res.json()['id']
            print(f"Created Lead ID: {lead_id}")
        else:
            print(f"Failed to create lead: {lead_res.text}")
            lead_id = 1 # Fallback, might fail
    except Exception as e:
        print(f"Error creating lead: {e}")
        lead_id = 1

    # 1. Create Campaign
    print_step("1. Creating Active Campaign")
    try:
        res = requests.post(f"{BASE_URL}/campaigns/", json={
            "name": "Exec Test Campaign",
            "status": "active",
            "type": "email"
        })
        if res.status_code != 200:
            print(f"FAILED ({res.status_code}): {res.text}")
            sys.exit(1)
        camp = res.json()
        cid = camp['id']
        print(f"Campaign ID: {cid}")
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to localhost:8000. Is the server running?")
        sys.exit(1)

    # 2. Add Steps: Email -> Task
    print_step("2. Adding Steps")
    requests.post(f"{BASE_URL}/campaigns/{cid}/steps", json={
        "order": 1, "step_type": "email", "name": "Intro", "content_instruction": "Hi {{first_name}}"
    })
    requests.post(f"{BASE_URL}/campaigns/{cid}/steps", json={
        "order": 2, "step_type": "task", "name": "Call Check", "content_instruction": "Call them"
    })
    
    # 3. Add Lead
    print_step(f"3. Adding Lead {lead_id}")
    res = requests.post(f"{BASE_URL}/campaigns/{cid}/leads", json=[lead_id])
    if res.status_code != 200:
        print(f"Pending Lead Add Failed: {res.text}")

    # 4. Trigger Process (Should execute Step 1: Email)
    print_step("4. Triggering Process (Expect Email)")
    res = requests.post(f"{BASE_URL}/campaigns/process")
    print(f"Result: {res.text}")
    
    # 5. Trigger Process again (Expect Task, since no delay)
    print_step("5. Triggering Process again (Expect Task)")
    res = requests.post(f"{BASE_URL}/campaigns/process")
    print(f"Result: {res.text}")

if __name__ == "__main__":
    run_test()
