from pydantic import BaseModel
from typing import Optional

class DraftRequest(BaseModel):
    lead_id: int
    type: str  # "email", "sms", "linkedin"
    tone: Optional[str] = "professional"  # "professional", "casual", "urgent"

class DraftResponse(BaseModel):
    subject: Optional[str] = None
    body: str

class TaskSuggestion(BaseModel):
    lead_id: Optional[int] = None
    lead_name: Optional[str] = None
    title: str
    type: str
    reason: str
    priority: str
