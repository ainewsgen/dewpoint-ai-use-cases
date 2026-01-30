import requests
import json
import uuid

API_URL = "http://127.0.0.1:8005/api"

def run_test():
    # 1. Create a Test Lead
    unique_email = f"test_{uuid.uuid4()}@example.com"
    lead_data = {
        "first_name": "Test",
        "last_name": "User",
        "email": unique_email,
        "company": "Test Corp",
        "title": "Tester"
    }
    
    print(f"Creating lead: {unique_email}...")
    try:
        resp = requests.post(f"{API_URL}/leads/", json=lead_data)
        if resp.status_code != 200:
            print(f"Failed to create lead: {resp.text}")
            return
        lead = resp.json()
        lead_id = lead['id']
        print(f"Lead created with ID: {lead_id}")
    except Exception as e:
        print(f"Error creating lead: {e}")
        return

    # 2. Create Deal (First Attempt)
    deal_data = {
        "title": "Test Deal 1",
        "value": 1000,
        "stage_id": 6, # Cold
        "lead_id": lead_id
    }
    
    print("Creating Deal (Attempt 1)...")
    resp = requests.post(f"{API_URL}/pipeline/deals", json=deal_data)
    if resp.status_code != 200:
        print(f"Failed to create deal 1: {resp.text}")
        return
    deal1 = resp.json()
    print(f"Deal 1 created/returned: ID={deal1.get('id')}")

    # Check for Lead Data
    if 'lead' in deal1 and deal1['lead']:
        print("PASS: Deal 1 has 'lead' data included.")
        print(f"      Lead Email: {deal1['lead']['email']}")
    else:
        print("FAIL: Deal 1 is missing 'lead' data!")
        print(f"      Response keys: {deal1.keys()}")

    # 3. Create Deal (Second Attempt - Duplicate Trigger Simulation)
    print("Creating Deal (Attempt 2 - Duplicate)...")
    resp = requests.post(f"{API_URL}/pipeline/deals", json=deal_data)
    if resp.status_code != 200:
        print(f"Failed to create deal 2: {resp.text}")
        return
    deal2 = resp.json()
    print(f"Deal 2 created/returned: ID={deal2.get('id')}")

    # 4. Verify Idempotency
    if deal1['id'] == deal2['id']:
        print("PASS: Idempotency check worked. Both requests returned the same Deal ID.")
    else:
        print(f"FAIL: Duplicate deal created! ID1={deal1['id']}, ID2={deal2['id']}")

if __name__ == "__main__":
    run_test()
