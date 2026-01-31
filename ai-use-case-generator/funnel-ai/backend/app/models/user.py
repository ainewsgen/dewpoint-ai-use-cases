from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from ..db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    phone = Column(String, nullable=True)
    
    # Address
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    
    # Preferences / Opt-ins
    sms_opt_in = Column(Boolean, default=False)
    email_opt_in = Column(Boolean, default=True)
    ebilling_opt_in = Column(Boolean, default=True)

    # Business Type (B2B, B2C, Hybrid)
    business_type = Column(String, default="b2b") # b2b, b2c, hybrid
    
    # Billing & Plan
    plan_tier = Column(String, default="free") # free, pro, enterprise
    billing_info = Column(JSON, nullable=True) # encrypted/masked card info
    subscription_status = Column(String, default="active")
    
    # Usage Tracking
    usage_leads_weekly = Column(Integer, default=0)
    usage_reset_at = Column(DateTime(timezone=True), server_default=func.now())
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
