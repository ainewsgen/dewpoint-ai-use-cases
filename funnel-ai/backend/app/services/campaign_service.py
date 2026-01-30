from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random # For mock sending
from app.models.campaign import Campaign, CampaignLead, CampaignStep
from app.models.lead import Lead
from app.models.task import Task
from app.models.template import MessageTemplate
from app.services.ai_draft import generate_campaign_content, analyze_sentiment

def process_campaign_leads(db: Session):
    """
    Main tick function. Finds leads ready for the next step and executes it.
    Should be called by a cron job or scheduler.
    """
    now = datetime.now()
    
    # 1. Find leads that are active and Due (next_run_at <= now, or None if just started)
    # We also check if the campaign itself is active.
    active_campaigns = db.query(Campaign).filter(Campaign.status == "active").all()
    campaign_ids = [c.id for c in active_campaigns]
    
    if not campaign_ids:
        return {"processed": 0, "message": "No active campaigns"}

    try:
        leads_to_process = db.query(CampaignLead).filter(
            CampaignLead.campaign_id.in_(campaign_ids),
            CampaignLead.status == "active",
            (CampaignLead.next_run_at <= now) | (CampaignLead.next_run_at == None)
        ).all()
        
        processed_count = 0
        
        for cl in leads_to_process:
            try:
                execute_current_step_for_lead(db, cl)
                processed_count += 1
            except Exception as e:
                print(f"Error processing lead {cl.id}: {e}")
                # Optional: Mark as error state
                
        return {"processed": processed_count}
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

def execute_current_step_for_lead(db: Session, campaign_lead: CampaignLead):
    current_step = None
    if campaign_lead.current_step_id:
        current_step = db.query(CampaignStep).filter(CampaignStep.id == campaign_lead.current_step_id).first()
    
    # If no current step, we assume we just started or finished.
    # Logic: If next_run_at is NOT None, and we are here, it means we passed the wait for the PREVIOUS step?
    # Actually, current_step_id usually points to the step we are ABOUT TO DO or CURRENTLY WAITING ON.
    # Let's say current_step points to the step we need to execute NOW.
    
    if not current_step:
        # Maybe finished?
        campaign_lead.status = "completed"
        db.commit()
        return

    # Execute Logic
    success = False
    
    if current_step.step_type == 'email':
        success = _execute_email_step(db, campaign_lead, current_step)
    elif current_step.step_type == 'task':
        success = _execute_task_step(db, campaign_lead, current_step)
    elif current_step.step_type == 'delay':
        # Delay is a bit special. If we are 'at' a delay step, it means we should wait.
        # But if process_campaign_leads picked this up, it means the wait is OVER (next_run_at <= now).
        # So we just proceed to the next step immediately.
        success = True
    elif current_step.step_type == 'branch':
        # Branching logic (simplified)
        success = True 
        
    if success:
        # Move to next step
        advance_lead_to_next_step(db, campaign_lead, current_step)

def _execute_email_step(db: Session, campaign_lead: CampaignLead, step: CampaignStep):
    # Mock Sending Email
    lead = db.query(Lead).filter(Lead.id == campaign_lead.lead_id).first()
    
    subject = "No Subject"
    body = "No Content"
    
    if step.template_id:
        template = db.query(MessageTemplate).filter(MessageTemplate.id == step.template_id).first()
        if template:
            subject = template.subject
            body = template.body
            # Personalization (Simple)
            if lead:
                body = body.replace("{{first_name}}", lead.first_name or "Friend")
                body = body.replace("{{company}}", lead.company or "your company")
    elif step.content_instruction:
        # Use AI Generation
        if lead:
            ai_result = generate_campaign_content(lead, step.content_instruction, "email")
            subject = ai_result.get("subject", "AI Subject")
            body = ai_result.get("body", "")
            
    print(f"--- SENDING EMAIL TO {lead.email} ---")
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    print("---------------------------------------")
    
    # Update stats
    if campaign_lead.campaign:
        campaign_lead.campaign.sent_count += 1
    
    return True

def _execute_task_step(db: Session, campaign_lead: CampaignLead, step: CampaignStep):
    # Create a Task in the system
    new_task = Task(
        title=f"Campaign Task: {step.name}",
        description=step.content_instruction or "Manual step required",
        lead_id=campaign_lead.lead_id,
        is_completed=False,
        due_date=datetime.now() + timedelta(days=1)
    )
    db.add(new_task)
    print(f"--- CREATED TASK FOR LEAD {campaign_lead.lead_id}: {step.name} ---")
    return True

def advance_lead_to_next_step(db: Session, campaign_lead: CampaignLead, current_step: CampaignStep):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_lead.campaign_id).first()
    all_steps = sorted(campaign.steps, key=lambda s: s.order)
    
    # Find index of current
    try:
        curr_idx = next(i for i, s in enumerate(all_steps) if s.id == current_step.id)
        next_step = all_steps[curr_idx + 1] if curr_idx + 1 < len(all_steps) else None
    except ValueError:
        next_step = None

    if next_step:
        campaign_lead.current_step_id = next_step.id
        
        # Calculate delay for the NEW step
        # If the new step is a 'delay' step, we set next_run_at to now + delay
        # If the new step is an action (email), we usually execute immediately (next_run_at = now)
        # UNLESS the PREVIOUS step was a delay? No, standard is: Action -> Wait -> Action.
        
        if next_step.step_type == 'delay':
            # It's a delay step. Set execution time to future.
            # Next time we pick it up, it will be "due" and we will pass through it.
            delay = timedelta(days=next_step.wait_days)
            campaign_lead.next_run_at = datetime.now() + delay
            print(f"--- QUEUED NEXT STEP (Delay) in {next_step.wait_days} days ---")
            
        else:
            # Immediate action
            campaign_lead.next_run_at = datetime.now()
            print(f"--- QUEUED NEXT STEP (Immediate) ---")
            
    else:
        # End of campaign
        campaign_lead.status = "completed"
        campaign_lead.current_step_id = None
        print(f"--- CAMPAIGN COMPLETED FOR LEAD {campaign_lead.lead_id} ---")
        
    campaign_lead.last_run_at = datetime.now()
    db.commit()

def handle_email_reply(db: Session, email_address: str, body: str, subject: str = None):
    """
    Processes an incoming email reply.
    1. Finds the lead and active campaign.
    2. Analyzes sentiment.
    3. Executes configured logic (branch_config).
    """
    # Find Lead
    lead = db.query(Lead).filter(Lead.email == email_address).first()
    if not lead:
        print(f"Reply received from unknown email: {email_address}")
        return False
        
    # Find Active Campaign Lead
    # We prioritize 'active' active campaigns. If multiple, pick most recent.
    # In a real system, we might use Message-ID headers to match exact step.
    campaign_lead = db.query(CampaignLead).filter(
        CampaignLead.lead_id == lead.id,
        CampaignLead.status == "active"
    ).order_by(CampaignLead.last_run_at.desc()).first()
    
    if not campaign_lead:
        print(f"No active campaign found for replying lead: {email_address}")
        return False
        
    # Update Status to Replied
    campaign_lead.status = "replied"
    # We might NOT want to stop the campaign immediately unless configured?
    # Usually a reply stops automation until manual review.
    # But here we want to automate the NEXT step based on sentiment.
    
    sentiment = analyze_sentiment(body)
    print(f"--- EMAIL REPLY RECEIVED FROM {email_address} ---")
    print(f"Sentiment: {sentiment}")
    
    # Get Current Step Config (or most recent step)
    # If they are in 'wait' (delay) mode, we look at the PREVIOUS step (which was likely the email).
    # OR the delay step itself might assume it follows an email. 
    # Let's check the current step.
    
    current_step = None
    if campaign_lead.current_step_id:
        current_step = db.query(CampaignStep).filter(CampaignStep.id == campaign_lead.current_step_id).first()
        
    # If config exists on current step, use it. If not, maybe check previous step?
    # For now, let's assume the current step (even if delay) has the context or we search back.
    # Simplification: Expect 'branch_config' on the step that SENT the email.
    # But if we are in 'delay', we need to find that previous step.
    
    config_step = current_step
    
    # Simple backtrack: If current is Delay, check previous step.
    if current_step and current_step.step_type == 'delay':
         # Find step with order < current.order
         # This assumes linear order numbers.
         previous_step = db.query(CampaignStep).filter(
             CampaignStep.campaign_id == campaign_lead.campaign_id,
             CampaignStep.order < current_step.order
         ).order_by(CampaignStep.order.desc()).first()
         if previous_step:
             config_step = previous_step

    # Extract Logic
    # Default Config if missing
    positive_action = "create_task"
    negative_action = "disqualify"
    
    if config_step and config_step.branch_config:
        positive_action = config_step.branch_config.get("positive_sentiment", positive_action)
        negative_action = config_step.branch_config.get("negative_sentiment", negative_action)
        
    action = positive_action if sentiment == "positive" else negative_action
    
    print(f"Executing Action: {action}")
    
    if action == "disqualify":
        campaign_lead.status = "disqualified" # or "bounced" / "stopped"
        print(f"Lead {lead.email} disqualified.")
        
    elif action == "create_task":
        # Create Task
        new_task = Task(
            title=f"Reply from {lead.first_name} ({sentiment})",
            description=f"Lead replied: {body[:100]}...",
            lead_id=lead.id,
            is_completed=False,
            due_date=datetime.now()
        )
        db.add(new_task)
        # Maybe pause campaign?
        campaign_lead.status = "paused"
        
    elif action == "next_step":
        # Force advance
        # Ensure we are 'active' to continue
        campaign_lead.status = "active"
        if current_step:
             advance_lead_to_next_step(db, campaign_lead, current_step)
             
    elif action == "notify":
        # Just log/notify (Task with low priority?)
        pass

    db.commit()
    return True
