import requests
import json

BASE_URL = "http://localhost:8000/api/leads"

def test_deduplication():
    # 1. Create Base Lead
    lead1 = {
        "first_name": "Dedup",
        "last_name": "Test",
        "email": "dedup.test@example.com",
        "company": "Test Co",
        "title": "Tester",
        "secondary_email": "sec@example.com",
        "secondary_phone": "555-0000"
    }
    
    print("Creating initial lead...")
    r1 = requests.post(BASE_URL + "/", json=lead1)
    if r1.status_code == 200:
        print("✅ Lead 1 created successfully.")
        data = r1.json()
        if data.get("secondary_email") == "sec@example.com":
             print("✅ Secondary Email verified.")
    else:
        print(f"❌ Failed to create lead 1: {r1.text}")
        return

    # 2. Test Duplicate Email
    lead2 = lead1.copy()
    lead2["first_name"] = "Different"
    lead2["last_name"] = "Name"
    # Email is same
    
    print("\nTesting Duplicate Email...")
    r2 = requests.post(BASE_URL + "/", json=lead2)
    if r2.status_code == 400 and "email" in r2.text:
        print("✅ Duplicate Email BLOCKED (Correct).")
    else:
        print(f"❌ Duplicate Email ALLOWED or Wrong Error: {r2.status_code} {r2.text}")

    # 3. Test Duplicate Name
    lead3 = lead1.copy()
    lead3["email"] = "different.email@example.com"
    # Name is same "Dedup Test"
    
    print("\nTesting Duplicate Name...")
    r3 = requests.post(BASE_URL + "/", json=lead3)
    if r3.status_code == 400 and "name" in r3.text:
        print("✅ Duplicate Name BLOCKED (Correct).")
    else:
        print(f"❌ Duplicate Name ALLOWED or Wrong Error: {r3.status_code} {r3.text}")

    # Cleanup
    # (Optional, or just manual cleanup later)

if __name__ == "__main__":
    test_deduplication()
