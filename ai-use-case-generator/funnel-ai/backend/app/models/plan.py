from sqlalchemy import Column, Integer, String, Float, JSON, Boolean
from ..db.session import Base

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    price = Column(Float, default=0.0)
    interval = Column(String, default="month") # 'month', 'year'
    features = Column(JSON, default={}) # {"lead_discovery": true, "ai_enrichment": false}
    weekly_limit = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
