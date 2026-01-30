from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..db.session import Base

class CRMIntegration(Base):
    __tablename__ = "crm_integrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    crm_type = Column(String)  # hubspot, salesforce, etc.
    is_connected = Column(Boolean, default=False)
    # OAuth tokens
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    # API Credentials (for manual setup like SMTP/Twilio)
    api_key = Column(String, nullable=True)     # or Username/SID
    api_secret = Column(String, nullable=True)  # or Password/AuthToken
    endpoint = Column(String, nullable=True)    # or Host
    
    settings = Column(JSON, default={})  # Sync preferences

    user = relationship("User")

class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    title = Column(String, nullable=True) # e.g. "Call with John"
    type = Column(String, default="task") # call, email, meeting, task
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, completed, cancelled
    is_dismissed = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lead = relationship("Lead")

class LeadNote(Base):
    __tablename__ = "lead_notes"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    content = Column(Text, nullable=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lead = relationship("Lead")


