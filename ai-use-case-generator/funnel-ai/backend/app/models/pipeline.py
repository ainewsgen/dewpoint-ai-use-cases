from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db.session import Base
from .lead import Lead
from .task import Task

class Stage(Base):
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    order = Column(Integer, default=0)
    color = Column(String, default="blue") # Tailwind color name or hex
    
    deals = relationship("Deal", back_populates="stage")

class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    value = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    
    # Foreign Keys
    stage_id = Column(Integer, ForeignKey("stages.id"))
    lead_id = Column(Integer, ForeignKey("leads.id"))
    
    # Relationships
    stage = relationship("Stage", back_populates="deals")
    lead = relationship("Lead")
    
    # Metadata
    expected_close_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tasks = relationship("Task", back_populates="deal")
