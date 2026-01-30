from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ActionResponse(BaseModel):
    status: str
    message: str
    timestamp: datetime = datetime.now()

class EmailRequest(BaseModel):
    lead_id: int
    subject: str
    body: str

class SMSRequest(BaseModel):
    lead_id: int
    message: str

class LinkedInRequest(BaseModel):
    lead_id: int
    message: str

class PipelineAddRequest(BaseModel):
    lead_id: int
    stage_id: int

class FollowUpRequest(BaseModel):
    lead_id: int
    scheduled_at: datetime
    notes: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = "task"

class NoteRequest(BaseModel):
    lead_id: int
    content: str
