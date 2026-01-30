from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict
from datetime import datetime

class LeadBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    secondary_email: Optional[EmailStr] = None
    secondary_phone: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    social_profiles: Optional[Dict[str, str]] = {}
    revenue_last_year: Optional[float] = None
    contract_signed_date: Optional[datetime] = None
    last_service_usage: Optional[datetime] = None
    
    # Enhanced Insights
    sentiment: Optional[str] = None
    customer_tier: Optional[str] = None
    lifecycle_stage: Optional[str] = None
    services_used: Optional[str] = None
    
    # Disqualification Logic
    disqualification_reason: Optional[str] = None
    disqualified_at: Optional[datetime] = None

class LeadNoteCreate(BaseModel):
    content: str

class LeadNote(BaseModel):
    id: int
    lead_id: int
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LeadCreate(LeadBase):
    source: Optional[str] = "manual"

class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    secondary_email: Optional[EmailStr] = None
    secondary_phone: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    social_profiles: Optional[Dict[str, str]] = None
    
    # Status & Score
    status: Optional[str] = None
    score: Optional[int] = None
    source: Optional[str] = None

    # Customer Value
    revenue_last_year: Optional[float] = None
    contract_signed_date: Optional[datetime] = None
    last_service_usage: Optional[datetime] = None
    
    # Enhanced Insights
    sentiment: Optional[str] = None
    customer_tier: Optional[str] = None
    lifecycle_stage: Optional[str] = None
    services_used: Optional[str] = None

    # Disqualification Logic
    disqualification_reason: Optional[str] = None
    disqualified_at: Optional[datetime] = None

class Lead(LeadBase):
    id: int
    score: int
    status: str
    source: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_contacted_at: Optional[datetime] = None
    last_contact_method: Optional[str] = None
    next_scheduled_action: Optional[datetime] = None
    
    disqualification_reason: Optional[str] = None
    disqualified_at: Optional[datetime] = None

    class Config:
        from_attributes = True
