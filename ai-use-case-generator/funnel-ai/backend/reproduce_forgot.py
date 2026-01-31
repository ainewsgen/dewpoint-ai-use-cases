import requests

try:
    response = requests.post(
        "http://localhost:8005/api/forgot-password",
        json={"email": "browser_test_3@example.com"}
    )
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
