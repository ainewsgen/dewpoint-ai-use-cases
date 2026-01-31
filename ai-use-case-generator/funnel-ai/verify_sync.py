import urllib.request
import json

try:
    with urllib.request.urlopen('http://localhost:8000/api/leads') as response:
        data = json.loads(response.read().decode())
        lead1 = next((l for l in data if l['id'] == 1), None)
        if lead1:
            print(f"Lead 1 Next Action: {lead1.get('next_scheduled_action')}")
        else:
            print("Lead 1 not found")
except Exception as e:
    print(e)
