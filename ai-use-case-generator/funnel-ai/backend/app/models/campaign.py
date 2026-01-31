from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db.session import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    status = Column(String, default="draft")  # draft, active, paused, completed
    type = Column(String, default="email")    # email, linkedin, multi-channel
    
    # Configuration
    # 'linear' (simple sequence) or 'adaptive' (AI branching)
    workflow_type = Column(String, default="linear")  
    aggression_level = Column(String, default="medium") # low, medium, high
    
    # Schedule: e.g. {"days": ["Mon", "Tue"], "start_time": "09:00", "end_time": "17:00", "timezone": "UTC"}
    schedule_config = Column(JSON, nullable=True)  
    
    # Stats
    sent_count = Column(Integer, default=0)
    open_count = Column(Integer, default=0)
    reply_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    steps = relationship("CampaignStep", back_populates="campaign", cascade="all, delete-orphan")
    leads = relationship("CampaignLead", back_populates="campaign")

class CampaignStep(Base):
    """
    Defines a single step in the campaign workflow.
    """
    __tablename__ = "campaign_steps"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    
    order = Column(Integer, nullable=False) # 1, 2, 3...
    name = Column(String, nullable=True) # "Initial Outreach", "Follow Up 1"
    
    step_type = Column(String, nullable=False) # 'email', 'delay', 'task', 'call', 'branch'
    
    # Configuration depends on type
    # For 'email': template_id
    template_id = Column(Integer, ForeignKey("message_templates.id"), nullable=True)
    
    # For 'delay': wait_days, wait_hours
    wait_days = Column(Integer, default=0)
    
    # For 'branch': condition logic (e.g. {"if": "replied", "goto": 5, "else": 3})
    branch_config = Column(JSON, nullable=True)
    
    # Content Override (if not using template ID, or for AI generated generic prompt)
    content_instruction = Column(Text, nullable=True) # e.g. "Send a polite bump"
    
    campaign = relationship("Campaign", back_populates="steps")
    template = relationship("MessageTemplate") # Assuming MessageTemplate is imported or available in scope

class CampaignLead(Base):
    """
    Tracks a specific Lead's journey through a Campaign.
    """
    __tablename__ = "campaign_leads"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    lead_id = Column(Integer, ForeignKey("leads.id"))
    
    status = Column(String, default="active") # active, paused, completed, replied, bounced
    
    current_step_id = Column(Integer, ForeignKey("campaign_steps.id"), nullable=True)
    
    # Scheduling
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit trail / Messages sent
    # We could link to a separate 'CampaignExecution' table for full history, 
    # but for simple tracking we store metadata here.
    history = Column(JSON, default=[]) # [{"step_id": 1, "action": "sent", "timestamp": "..."}]
    
    campaign = relationship("Campaign", back_populates="leads")
    lead = relationship("Lead")
    current_step = relationship("CampaignStep")

# NOTE: We need to ensure MessageTemplate is imported in the main models/__init__.py 
# or here to resolve the relationship if used in the same declarative base.
# For now, we assume standard import structure.
