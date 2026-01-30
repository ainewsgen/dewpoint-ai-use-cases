from ..models.lead import Lead
from ..models.brand import BrandSettings

def calculate_lead_score(lead: Lead, weights: BrandSettings) -> int:
    """
    Calculates a lead score (0-100) based on weighted factors.
    """
    score = 0
    
    # 1. Pipeline Stage (Highest Impact)
    # cold=10, contacted=30, qualified=60, closed=100
    stage_scores = {
        "new": 10,
        "contacted": 30,
        "qualified": 60,
        "closed": 100,
        "lost": 0
    }
    base_stage_score = stage_scores.get((lead.status or "new").lower(), 10)
    
    # 2. Seniority (Based on Job Title)
    seniority_bonus = 0
    title_lower = lead.title.lower() if lead.title else ""
    if any(word in title_lower for word in ["ceo", "founder", "president", "owner"]):
        seniority_bonus = 100
    elif any(word in title_lower for word in ["vp", "vice president", "head of"]):
        seniority_bonus = 80
    elif any(word in title_lower for word in ["director", "lead"]):
        seniority_bonus = 60
    elif any(word in title_lower for word in ["manager"]):
        seniority_bonus = 40
    
    # 3. ICP Fit (Simulated based on company known types or industry)
    icp_score = 50 # Default middle ground
    if lead.industry and any(ind in lead.industry.lower() for ind in ["software", "technology", "saas"]):
        icp_score = 100
    
    # 4. Intent & Engagement (Detailed Factors)
    # Individual signal impact (0-100)
    signal_scores = {
        "website": lead.meta_data.get("website_visits", 0) * 10 if lead.meta_data else 0,
        "pricing": 100 if lead.meta_data and lead.meta_data.get("viewed_pricing") else 0,
        "demo": 100 if lead.meta_data and lead.meta_data.get("requested_demo") else 0,
        "content": 70 if lead.meta_data and lead.meta_data.get("downloaded_content") else 0,
        "social": 50 if lead.meta_data and lead.meta_data.get("social_engagement") else 0,
        "email": 40 if lead.meta_data and (lead.meta_data.get("opened_email") or lead.meta_data.get("clicked_link")) else 0
    }
    
    # Simplified weighting:
    total_weights = (weights.weight_icp + weights.weight_seniority + 
                     weights.weight_intent_website + weights.weight_intent_pricing +
                     weights.weight_intent_demo + weights.weight_intent_content +
                     weights.weight_intent_social + weights.weight_intent_email)
    
    if total_weights == 0:
        return base_stage_score
        
    weighted_sum = (
        (icp_score * (weights.weight_icp / 100)) +
        (seniority_bonus * (weights.weight_seniority / 100)) +
        (signal_scores["website"] * (weights.weight_intent_website / 100)) +
        (signal_scores["pricing"] * (weights.weight_intent_pricing / 100)) +
        (signal_scores["demo"] * (weights.weight_intent_demo / 100)) +
        (signal_scores["content"] * (weights.weight_intent_content / 100)) +
        (signal_scores["social"] * (weights.weight_intent_social / 100)) +
        (signal_scores["email"] * (weights.weight_intent_email / 100))
    )
    
    # Blend with Stage Score (Stage is 50%, Signals are 50% normalized)
    final_score = (base_stage_score * 0.5) + (min(100, weighted_sum) * 0.5)
    
    return int(min(100, final_score))
