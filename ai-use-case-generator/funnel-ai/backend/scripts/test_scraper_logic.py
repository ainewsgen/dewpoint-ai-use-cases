import sys
import os
from unittest.mock import patch, MagicMock

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.api.scraper import search_leads_endpoint, SearchRequest

def test_scraper_queries():
    print("--- Testing Scraper Query Logic ---")
    
    # Mock the search_google function to capture arguments
    with patch('app.api.scraper.search_google') as mock_search:
        mock_search.return_value = []
        
        # Test 1: Job Boards
        print("\nTest 1: Job Boards (Hiring Managers)")
        req_jobs = SearchRequest(
            keywords="Software Agency",
            job_title="CTO",
            location="New York",
            platform="jobs"
        )
        search_leads_endpoint(req_jobs)
        
        # Verify Query
        args, _ = mock_search.call_args
        query = args[0]
        print(f"Generated Query: {query}")
        
        expected_parts = ["site:indeed.com", "site:monster.com", "CTO", "Software Agency", "Hiring Manager", "New York"]
        if all(part in query for part in expected_parts):
            print("SUCCESS: Query contains all expected parts for Jobs platform.")
        else:
            print("FAILURE: Query missing expected parts.")

        # Test 2: Freelance
        print("\nTest 2: Freelance (Service Seekers)")
        req_freelance = SearchRequest(
            keywords="Web Development",
            platform="freelance"
        )
        search_leads_endpoint(req_freelance)
        
        args, _ = mock_search.call_args
        query = args[0]
        print(f"Generated Query: {query}")
        
        expected_parts_fl = ["site:upwork.com", "site:fiverr.com", "Web Development", "Looking for"]
        if all(part in query for part in expected_parts_fl):
             print("SUCCESS: Query contains all expected parts for Freelance platform.")
        else:
             print("FAILURE: Query missing expected parts.")

if __name__ == "__main__":
    try:
        test_scraper_queries()
    except Exception as e:
        print(f"Test Failed: {e}")
