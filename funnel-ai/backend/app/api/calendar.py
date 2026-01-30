from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from ..db.session import get_db
from ..models.crm import FollowUp
from ..models.lead import Lead
from pydantic import BaseModel

router = APIRouter()

class CalendarEvent(BaseModel):
    id: int
    title: str
    start: datetime
    end: Optional[datetime] = None # Optional end time, defaults to start + 30m in UI
    allDay: bool = False
    type: str # call, email, meeting, task
    status: str
    lead_id: Optional[int] = None
    lead_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    lead_id: Optional[int] = None
    title: Optional[str] = None
    type: str = "task"
    scheduled_at: datetime
    notes: Optional[str] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    
@router.post("/events", response_model=CalendarEvent)
def create_event(evt: EventCreate, db: Session = Depends(get_db)):
    # Verify lead if provided
    if evt.lead_id:
        lead = db.query(Lead).filter(Lead.id == evt.lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
    followup = FollowUp(
        lead_id=evt.lead_id,
        scheduled_at=evt.scheduled_at,
        notes=evt.notes,
        title=evt.title,
        type=evt.type,
        status="pending"
    )
    db.add(followup)
    db.commit()
    db.refresh(followup)
    
    # Construct response manually to handle computed fields or re-query with joins
    # Re-querying is safer for lead relation
    followup = db.query(FollowUp).options(joinedload(FollowUp.lead)).filter(FollowUp.id == followup.id).first()
    
    return CalendarEvent(
        id=followup.id,
        title=followup.title if followup.title else (f"{followup.type.capitalize()}: {followup.notes[:20] if followup.notes else 'No details'}" if not followup.lead else f"{followup.type.capitalize()} with {followup.lead.first_name}"),
        start=followup.scheduled_at,
        type=followup.type or 'task',
        status=followup.status,
        lead_id=followup.lead_id,
        lead_name=f"{followup.lead.first_name} {followup.lead.last_name}" if followup.lead else "General Task"
    )

@router.put("/events/{event_id}", response_model=CalendarEvent)
def update_event(event_id: int, evt: EventUpdate, db: Session = Depends(get_db)):
    followup = db.query(FollowUp).filter(FollowUp.id == event_id).first()
    if not followup:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if evt.title is not None: followup.title = evt.title
    if evt.type is not None: followup.type = evt.type
    if evt.scheduled_at is not None: followup.scheduled_at = evt.scheduled_at
    if evt.notes is not None: followup.notes = evt.notes
    if evt.status is not None: followup.status = evt.status
    
    db.commit()
    db.refresh(followup)
    
    # Re-query for lead info
    followup = db.query(FollowUp).options(joinedload(FollowUp.lead)).filter(FollowUp.id == followup.id).first()

    return CalendarEvent(
        id=followup.id,
        title=followup.title if followup.title else (f"{followup.type.capitalize()}: {followup.notes[:20] if followup.notes else 'No details'}" if not followup.lead else f"{followup.type.capitalize()} with {followup.lead.first_name}"),
        start=followup.scheduled_at,
        type=followup.type or 'task',
        status=followup.status,
        lead_id=followup.lead_id,
        lead_name=f"{followup.lead.first_name} {followup.lead.last_name}" if followup.lead else "General Task"
    )

@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    followup = db.query(FollowUp).filter(FollowUp.id == event_id).first()
    if not followup:
        raise HTTPException(status_code=404, detail="Event not found")
        
    db.delete(followup)
    db.commit()
    return {"status": "success", "message": "Event deleted"}

@router.get("/events", response_model=List[CalendarEvent])
def read_events(
    start: Optional[datetime] = None, 
    end: Optional[datetime] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(FollowUp).options(joinedload(FollowUp.lead))
    
    # Filter by date range if provided
    if start:
        query = query.filter(FollowUp.scheduled_at >= start)
    if end:
        query = query.filter(FollowUp.scheduled_at <= end)
        
    # Exclude dismissed? Maybe user wants to see them but marked done?
    # query = query.filter(FollowUp.is_dismissed == False) 
    
    followups = query.all()
    
    events = []
    for f in followups:
        # Default title if missing
        default_title = f"{f.type.capitalize()} with {f.lead.first_name} {f.lead.last_name}" if f.lead else f"{f.type.capitalize()}: {f.notes[:20] if f.notes else 'No details'}"
        evt_title = f.title if f.title else default_title
        
        events.append(CalendarEvent(
            id=f.id,
            title=evt_title,
            start=f.scheduled_at,
            type=f.type or 'task',
            status=f.status,
            lead_id=f.lead_id,
            lead_name=f"{f.lead.first_name} {f.lead.last_name}" if f.lead else "General Task"
        ))
        
    return events

@router.get("/sync/ical")
def download_ical(db: Session = Depends(get_db)):
    """
    Generate iCal feed for all pending tasks
    """
    from fastapi.responses import Response
    
    followups = db.query(FollowUp).options(joinedload(FollowUp.lead)).filter(FollowUp.status == 'pending').all()
    
    ical_content = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Funnel.ai//Calendar//EN",
        "CALSCALE:GREGORIAN",
    ]
    
    for f in followups:
        dt_start = f.scheduled_at.strftime('%Y%m%dT%H%M%SZ') # UTC
        # Assume 1 hour duration
        # dt_end = ... 
        
        summary = f.title if f.title else (f"{f.type.capitalize() or 'Task'}: {f.lead.first_name} {f.lead.last_name}" if f.lead else f"{f.type.capitalize()}: General Task")
        description = f.notes or ""
        
        ical_content.extend([
            "BEGIN:VEVENT",
            f"UID:funnel-task-{f.id}@funnel.ai",
            f"DTSTAMP:{dt_start}",
            f"DTSTART:{dt_start}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{description}",
            "END:VEVENT"
        ])
        
    ical_content.append("END:VCALENDAR")
    
    return Response(content="\r\n".join(ical_content), media_type="text/calendar", headers={"Content-Disposition": "attachment; filename=tasks.ics"})
