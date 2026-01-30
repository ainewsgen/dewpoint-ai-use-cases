from datetime import datetime
import pytz
from sqlalchemy.orm import Session
from app.models.campaign import Campaign, CampaignLead, CampaignStep
from app.models.lead import Lead
from app.models.template import MessageTemplate
import logging

logger = logging.getLogger(__name__)

class CampaignRunner:
    def __init__(self, db: Session):
        self.db = db

    def process_campaigns(self):
        """
        Main entry point. Finds active campaigns and processes their leads.
        """
        active_campaigns = self.db.query(Campaign).filter(Campaign.status == "active").all()
        
        results = {"processed": 0, "emails_sent": 0, "steps_advanced": 0}
        
        for campaign in active_campaigns:
            if not self._is_within_schedule(campaign):
                continue
                
            # Process leads in this campaign
            # In a real system, we'd limit this query or use a queue
            active_leads = self.db.query(CampaignLead).filter(
                CampaignLead.campaign_id == campaign.id,
                CampaignLead.status == "active"
            ).all()
            
            for lead_state in active_leads:
                try:
                    result = self._process_lead(lead_state, campaign)
                    if result:
                        results[result] += 1
                except Exception as e:
                    logger.error(f"Error processing lead {lead_state.id}: {e}")
                    
        return results

    def _is_within_schedule(self, campaign: Campaign) -> bool:
        """
        Checks if the current time is within the campaign's active schedule.
        """
        config = campaign.schedule_config or {}
        timezone_str = config.get("timezone", "UTC")
        active_days = config.get("days", ["Mon", "Tue", "Wed", "Thu", "Fri"])
        start_time_str = config.get("start_time", "09:00")
        end_time_str = config.get("end_time", "17:00")

        try:
            tz = pytz.timezone(timezone_str)
            now = datetime.now(tz)
            
            # Check Day
            current_day = now.strftime("%a")
            if current_day not in active_days:
                return False
                
            # Check Time
            current_time = now.time()
            start_time = datetime.strptime(start_time_str, "%H:%M").time()
            end_time = datetime.strptime(end_time_str, "%H:%M").time()
            
            if not (start_time <= current_time <= end_time):
                return False
                
            return True
        except Exception as e:
            logger.error(f"Schedule check failed for campaign {campaign.id}: {e}")
            # Fail safe: if config is broken, default to active (or paused? default active for MVP)
            return True

    def _process_lead(self, lead_state: CampaignLead, campaign: Campaign):
        """
        Determines the next action for a lead.
        """
        # If no current step, start at Step 1
        if not lead_state.current_step_id:
            first_step = self._get_ordered_steps(campaign)[0]
            if not first_step:
                return None # Empty campaign
            
            lead_state.current_step_id = first_step.id
            self.db.commit()
            # Don't execute immediately, wait for next tick or proceed?
            # Let's proceed immediately to execution
            
        step = self.db.query(CampaignStep).get(lead_state.current_step_id)
        if not step:
            # Step deleted?
            return None

        # CHECK DELAY / WAIT
        if lead_state.next_run_at:
            if datetime.now(pytz.UTC) < lead_state.next_run_at:
                return None # Still waiting

        # EXECUTE STEP
        action_taken = None
        
        if step.step_type == 'email':
            self._execute_email_step(lead_state, step)
            action_taken = "emails_sent"
            self._advance_lead(lead_state, campaign, step)
            
        elif step.step_type == 'delay':
            # Set next_run_at and advance
            # Ideally 'delay' is handled by setting next_run_at on the *previous* step's completion
            # But if 'Delay' is a distinct node:
            wait_days = step.wait_days or 1
            # We treat the "action" of a delay step as "scheduling the wake up"
            # Logic: If we just arrived here, we wait. If we already waited, we advance.
            # Simplified: Advance immediately but set next_run_at on the NEXT step
            # OR: distinct wait logic. 
            
            # MVP Logic: 'Delay' steps simply hold the lead for X days.
            # If next_run_at is NOT set, set it.
            if not lead_state.next_run_at:
                # Schedule it
                from datetime import timedelta
                lead_state.next_run_at = datetime.now(pytz.UTC) + timedelta(days=wait_days)
                self.db.commit()
                return None # Waiting starts now
            else:
                # If we are here and next_run_at IS set, and we passed the check at the top,
                # it means the wait is over.
                lead_state.next_run_at = None # Clear it
                self._advance_lead(lead_state, campaign, step)
                action_taken = "steps_advanced"

        elif step.step_type == 'task':
            # Create a Task in the system (TODO: Link to Tasks API)
            # For now, just advance
            self._advance_lead(lead_state, campaign, step)
            action_taken = "steps_advanced"
            
        return action_taken

    def _execute_email_step(self, lead_state: CampaignLead, step: CampaignStep):
        """
        Simulates sending an email.
        """
        # In real world: Use Gmail API / SMTP
        # Here: Log it and add to history
        
        template_name = step.template.name if step.template else "No Template"
        
        logger.info(f"mock_send_email: To={lead_state.lead.email}, Template={template_name}")
        
        # Audit Trail
        history_item = {
            "step_id": step.id,
            "action": "sent",
            "timestamp": datetime.now().isoformat(),
            "details": f"Simulated email using {template_name}"
        }
        
        # Append to JSON history (copy, append, set back)
        current_hist = list(lead_state.history) if lead_state.history else []
        current_hist.append(history_item)
        lead_state.history = current_hist
        
        # Update Stats
        lead_state.campaign.sent_count += 1
        self.db.commit()

    def _advance_lead(self, lead_state: CampaignLead, campaign: Campaign, current_step: CampaignStep):
        """
        Moves lead to the next step or completes the campaign.
        """
        steps = self._get_ordered_steps(campaign)
        current_index = -1
        for i, s in enumerate(steps):
            if s.id == current_step.id:
                current_index = i
                break
        
        if current_index != -1 and current_index < len(steps) - 1:
            # Move to next
            next_step = steps[current_index + 1]
            lead_state.current_step_id = next_step.id
        else:
            # End of campaign
            lead_state.status = "completed"
            lead_state.current_step_id = None
            
        self.db.commit()

    def _get_ordered_steps(self, campaign):
        return sorted(campaign.steps, key=lambda x: x.order)
