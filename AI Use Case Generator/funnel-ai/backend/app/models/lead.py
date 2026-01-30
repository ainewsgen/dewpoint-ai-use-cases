from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from ..db.session import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    
    # Core Info
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    
    # Lead Engine v2 Fields
    # Note: tenant_id/workspace_id assumed implicit 1 for now or we add them
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True) # Link to canonical company
    bucket = Column(String, default="review") # hot/warm/review
    last_enriched_at = Column(DateTime(timezone=True), nullable=True)
    
    # Original fields...
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)
    secondary_email = Column(String, nullable=True)
    secondary_phone = Column(String, nullable=True)
    
    # Company Info
    title = Column(String, index=True)
    company = Column(String, index=True)
    industry = Column(String, nullable=True)
    location = Column(String, nullable=True)
    
    # Scoring & Status
    score = Column(Integer, default=0)
    status = Column(String, default="new")  # new, contacted, qualified, lost
    source = Column(String, default="manual")
    
    # Rich Data
    social_profiles = Column(JSON, nullable=True)  # {linkedin: url, twitter: url}
    meta_data = Column(JSON, nullable=True)  # funding info, news snippets
    
    # Contact Tracking
    last_contacted_at = Column(DateTime(timezone=True), nullable=True)
    last_contact_method = Column(String, nullable=True) # email, sms, linkedin, call, manual
    next_scheduled_action = Column(DateTime(timezone=True), nullable=True)

    # Customer Value
    revenue_last_year = Column(Float, nullable=True)
    contract_signed_date = Column(DateTime, nullable=True)
    last_service_usage = Column(DateTime, nullable=True)

    # Enhanced Insights
    sentiment = Column(String, nullable=True) # positive, neutral, negative
    customer_tier = Column(String, default="Standard") # Standard, Gold, Platinum
    lifecycle_stage = Column(String, default="Prospect - Cold") # Prospect - Cold/Warm/Hot, Qualified, Customer, Churned
    services_used = Column(String, default="[]") # JSON list of servicesomma-separated list

    # Disqualification Logic
    disqualification_reason = Column(String, nullable=True)
    disqualified_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
