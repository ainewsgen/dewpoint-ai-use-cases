import requests
import json

API_URL = "http://127.0.0.1:8005/api"

def debug_login():
    print("Attempting to login...")
    # OAuth2PasswordRequestForm sends data as form-data, NOT json
    payload = {
        "username": "patchenu@yahoo.com",
        "password": "test123"
    }
    
    try:
        resp = requests.post(f"{API_URL}/token", data=payload)
        
        print(f"Status Code: {resp.status_code}")
        try:
            print("Response JSON:")
            print(json.dumps(resp.json(), indent=2))
        except:
            print("Response Text:")
            print(resp.text)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_login()
