from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime

# --- Enums / Constants ---
# Step Types: 'email', 'delay', 'task'

# --- Campaign Step Schemas ---
class CampaignStepBase(BaseModel):
    name: Optional[str] = None
    order: int
    step_type: str
    template_id: Optional[int] = None
    wait_days: int = 0
    content_instruction: Optional[str] = None
    branch_config: Optional[Dict[str, Any]] = None

class CampaignStepCreate(CampaignStepBase):
    pass

class CampaignStepUpdate(BaseModel):
    name: Optional[str] = None
    step_type: Optional[str] = None
    template_id: Optional[int] = None
    wait_days: Optional[int] = None
    content_instruction: Optional[str] = None
    branch_config: Optional[Dict[str, Any]] = None

class CampaignStep(CampaignStepBase):
    id: int
    campaign_id: int
    
    class Config:
        from_attributes = True

# --- Campaign Lead Schemas ---
class CampaignLeadBase(BaseModel):
    lead_id: int
    status: str = "active"

class CampaignLeadCreate(CampaignLeadBase):
    pass

class CampaignLead(CampaignLeadBase):
    id: int
    campaign_id: int
    current_step_id: Optional[int]
    next_run_at: Optional[datetime]
    
    lead_name: Optional[str] # Computed/Joined
    
    class Config:
        from_attributes = True

# --- Campaign Schemas ---
class CampaignBase(BaseModel):
    name: str
    status: str = "draft"
    type: str = "email"
    workflow_type: str = "linear"
    aggression_level: str = "medium"
    schedule_config: Optional[Dict[str, Any]] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    schedule_config: Optional[Dict[str, Any]] = None
    # We generally don't update workflow type after creation easily

class Campaign(CampaignBase):
    id: int
    sent_count: int
    open_count: int
    reply_count: int
    created_at: datetime
    
    steps: List[CampaignStep] = []
    
    class Config:
        from_attributes = True
