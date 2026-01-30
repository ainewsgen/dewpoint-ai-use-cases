from typing import Dict, Any, Optional
from ..models.lead import Lead

class BaseEnrichmentProvider:
    """Base interface for data enrichment providers."""
    def enrich(self, lead: Lead) -> Dict[str, Any]:
        """
        Enrich a single lead.
        Returns a dictionary of fields to update on the lead.
        """
        raise NotImplementedError

class MockEnrichmentProvider(BaseEnrichmentProvider):
    """Simulates enrichment for development/demo purposes."""
    def enrich(self, lead: Lead) -> Dict[str, Any]:
        import random
        
        updates = {}
        
        # Simulate finding missing data
        if not lead.email:
            updates["email"] = f"{lead.first_name.lower()}.{lead.last_name.lower()}@example.com"
            
        if not lead.phone:
            updates["phone"] = f"+1 (555) {random.randint(100, 999)}-{random.randint(1000, 9999)}"
            
        if not lead.linkedin_url:
            updates["linkedin_url"] = f"https://linkedin.com/in/{lead.first_name.lower()}-{lead.last_name.lower()}"
            
        # Simulate title or company correction occasionally
        if not lead.title:
            updates["title"] = "Founder & CEO" # Optimistic guess
        
        return updates

class ApolloEnrichmentProvider(BaseEnrichmentProvider):
    """Placeholder for future Apollo.io integration."""
    def __init__(self, api_key: str):
        self.api_key = api_key
        
    def enrich(self, lead: Lead) -> Dict[str, Any]:
        # TODO: Implement actual Apollo API call
        # response = requests.post("https://api.apollo.io/v1/people/match", json={...})
        return {}

def get_enrichment_provider() -> BaseEnrichmentProvider:
    """
    Factory to get the configured provider.
    In production, this would read from environment variables.
    """
    # config = get_settings()
    # if config.ENRICHMENT_PROVIDER == "APOLLO":
    #     return ApolloEnrichmentProvider(config.APOLLO_API_KEY)
    
    return MockEnrichmentProvider()

def enrich_lead_service(lead: Lead) -> Dict[str, Any]:
    """Service function to enrich a lead and return the new data."""
    provider = get_enrichment_provider()
    return provider.enrich(lead)
