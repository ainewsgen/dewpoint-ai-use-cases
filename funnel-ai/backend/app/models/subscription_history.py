from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from ..db.session import Base

class SubscriptionHistory(Base):
    __tablename__ = "subscription_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # Simple ID reference for MVP, can be ForeignKey('users.id')
    
    from_tier = Column(String)
    to_tier = Column(String)
    action_type = Column(String) # UPGRADE, DOWNGRADE, CANCEL
    
    client_timestamp = Column(DateTime(timezone=True), nullable=True)
    server_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    authorized = Column(Boolean, default=True)
    authorization_text = Column(String, nullable=True)
