from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.lead import Lead
from ..schemas.ai import DraftRequest, DraftResponse
from ..services.ai_draft import generate_draft

router = APIRouter()

@router.post("/draft", response_model=DraftResponse)
def create_draft(request: DraftRequest, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == request.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    draft = generate_draft(lead, request.type, request.tone)
    return DraftResponse(**draft)

from typing import List
from ..schemas.ai import TaskSuggestion

@router.post("/generate-tasks", response_model=List[TaskSuggestion])
def generate_tasks(db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    
    today = datetime.now()
    limit_date_30 = today - timedelta(days=30)
    limit_date_14 = today - timedelta(days=14)
    limit_date_7 = today - timedelta(days=7)

    # Find leads that need attention (No next action, not lost/converted)
    leads = db.query(Lead).filter(
        Lead.next_scheduled_action == None,
        Lead.status.notin_(['converted', 'lost', 'disqualified'])
    ).order_by(Lead.score.desc()).limit(10).all()
    
    suggestions = []
    
    for lead in leads:
        # Default Logic
        title = "Follow Up"
        action_type = "task"
        reason = "Routine check-in"
        priority = "low"
        score_val = lead.score or 0

        # Smart Logic based on History & Status
        try:
            if not lead.last_contacted_at:
                title = "Initial Outreach"
                action_type = "email"
                reason = "Lead has never been contacted. Start engagement immediately."
                priority = "high" 
            else:
                last_contact = lead.last_contacted_at
                
                # Handle potential string from SQLite
                if isinstance(last_contact, str):
                    try:
                        last_contact = datetime.fromisoformat(last_contact)
                    except ValueError:
                        try:
                            last_contact = datetime.strptime(last_contact, '%Y-%m-%d %H:%M:%S')
                        except:
                            last_contact = None

                if last_contact and hasattr(last_contact, 'replace'):
                    last_contact = last_contact.replace(tzinfo=None)
                
                if not last_contact or not isinstance(last_contact, datetime):
                    title = "Follow Up"
                    action_type = "task"
                    reason = "Routine check-in (Date unknown)"
                    priority = "low"
                elif last_contact < limit_date_30:
                    title = "Re-engagement Campaign"
                    action_type = "email"
                    reason = f"Radio silence for 30+ days. Re-engage to keep lead alive."
                    priority = "high" if score_val > 60 else "medium"
                elif last_contact < limit_date_14:
                    title = "Nurture Follow-up"
                    action_type = "call"
                    reason = "2 weeks since last touch. Call to maintain relationship."
                    priority = "medium"
                elif last_contact < limit_date_7 and lead.status == 'contacted':
                    title = "Momentum Check-in"
                    action_type = "email"
                    reason = "Recent contact. Send value-add content to keep momentum."
                    priority = "low"
                elif lead.status == 'qualified':
                    title = "Schedule Closing Call"
                    action_type = "meeting"
                    reason = "Lead is qualified but no action scheduled. Push for close."
                    priority = "high"
        except Exception as e:
            # Fallback for individual lead error
            print(f"Error processing lead {lead.id}: {e}")
            continue

        suggestions.append(TaskSuggestion(
            lead_id=lead.id,
            lead_name=f"{lead.first_name} {lead.last_name}",
            title=title,
            type=action_type,
            reason=reason,
            priority=priority
        ))
    
    # Ensure uniqueness (deduplicate by (lead_name, title) to satisfy "if duplicates, show differences")
    unique_suggestions = {}
    for s in suggestions:
        dedup_key = f"{s.lead_name}-{s.title}"
        if s.lead_id and dedup_key not in unique_suggestions:
            unique_suggestions[dedup_key] = s
        elif not s.lead_id:
             # System tasks allow duplicates if distinct (handled below)
             pass
    
    suggestions = list(unique_suggestions.values())
    
    # "Always add another item" - ensuring we recommend creating contacts/finding leads
    # If we have few suggestions, or even if we have some, ALWAYS check if we should add prospecting tasks
    if len(suggestions) < 5:
        # Add a high-value prospecting task
        suggestions.append(TaskSuggestion(
            title="Import New Leads",
            type="task",
            reason=" replenish the top of the funnel to maintain pipeline velocity",
            priority="high",
            lead_name="System Recommendation"
        ))
        suggestions.append(TaskSuggestion(
            title="Research New Prospects on LinkedIn",
            type="task",
            reason="Find 10 new potential leads in target industry",
            priority="medium",
            lead_name="System Recommendation"
        ))

    # Sort: High value actions at the top
    priority_map = {"high": 3, "medium": 2, "low": 1}
    suggestions.sort(key=lambda x: priority_map.get(x.priority, 0), reverse=True)
        
    return suggestions[:5] # Return top 5 most valuable

