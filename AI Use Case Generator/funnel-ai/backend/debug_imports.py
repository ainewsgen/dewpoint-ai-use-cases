
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

try:
    from app.models.campaign import Campaign, CampaignStep
    from app.services.campaign_service import process_campaign_leads
    print("Imports Successful")
except Exception as e:
    print(f"Import Failed: {e}")
