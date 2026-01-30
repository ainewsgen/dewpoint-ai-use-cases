from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db.session import Base

class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    status = Column(String, default="draft")  # draft, sent, accepted, rejected
    
    # Content
    content = Column(Text, nullable=True) # Markdown or HTML content
    total_amount = Column(Float, default=0.0)
    
    # Relationships
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True) # Optional link to deal
    lead_id = Column(Integer, ForeignKey("leads.id"))
    
    # File storage (simulated path for MVP)
    pdf_path = Column(String, nullable=True)
    
    deal = relationship("Deal")
    lead = relationship("Lead")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
