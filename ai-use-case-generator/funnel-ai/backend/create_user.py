import requests
import json

API_URL = "http://127.0.0.1:8005/api"

def register_user():
    payload = {
        "full_name": "Patchen Uchiyama",
        "email": "patchenu@yahoo.com",
        "password": "test123",
        "business_type": "b2b", # Defaulting to b2b for now, ensuring backend accepts it
        "phone": None,
        "email_opt_in": True
    }
    
    print(f"Attempting to register user: {payload['email']}")
    
    try:
        resp = requests.post(f"{API_URL}/users/register", json=payload)
        
        if resp.status_code == 200:
            print("SUCCESS: User registered successfully!")
            print(json.dumps(resp.json(), indent=2))
        elif resp.status_code == 400:
            print(f"FAILURE: Registration failed. Detail: {resp.text}")
            if "already registered" in resp.text:
                print("NOTE: This user might already exist. Attempting login check...")
                login_check(payload['email'], payload['password'])
        else:
            print(f"FAILURE: Unexpected error {resp.status_code}: {resp.text}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to backend. Is it running on port 8005?")

def login_check(email, password):
    print(f"Attempting login for {email}...")
    resp = requests.post(f"{API_URL}/token", data={"username": email, "password": password})
    if resp.status_code == 200:
        print("SUCCESS: Login successful! User exists and credentials are valid.")
    else:
        print(f"FAILURE: Login failed. {resp.status_code}: {resp.text}")

if __name__ == "__main__":
    register_user()
