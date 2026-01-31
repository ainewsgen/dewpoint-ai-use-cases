from ..models.lead import Lead

def generate_draft(lead: Lead, type: str, tone: str = "professional") -> dict:
    """
    Generates a draft message based on the lead's information, communication type, and tone.
    Returns a dictionary with 'subject' (optional) and 'body'.
    """
    
    first_name = lead.first_name or "there"
    company = lead.company or "your company"
    title = lead.title or "your role"
    
    # Simple template engine based on type and tone
    if type == "email":
        return _generate_email(first_name, company, title, tone)
    elif type == "sms":
        return _generate_sms(first_name, company, tone)
    elif type == "linkedin":
        return _generate_linkedin(first_name, company, title, tone)
    else:
        return {"body": "Unsupported message type."}

def _generate_email(name, company, title, tone):
    if tone == "casual":
        subject = f"Quick question about {company}"
        body = f"""Hi {name},

I hope you're having a great week!

I was checking out {company} and your work as {title}, and I was really impressed. I'd love to chat briefly about how we might be able to help you scale your outreach.

Are you open to a quick coffee chat?

Best,
[Your Name]"""
    elif tone == "urgent":
         subject = f"Time-sensitive: Opportunity for {company}"
         body = f"""Hello {name},

I'm reaching out regarding a potential bottleneck we identified in your current process at {company}. We have a solution that addresses this immediately.

Could we schedule 10 minutes tomorrow to discuss?

Regards,
[Your Name]"""
    else: # professional
        subject = f"Partnership opportunity with {company}"
        body = f"""Dear {name},

I hope this email finds you well.

I am writing to you because your work as {title} at {company} stood out to us. We help companies like yours streamline their sales funnel, and I believe there could be significant synergy.

Would you be available for a brief call next week to discuss this further?

Sincerely,
[Your Name]"""
    
    return {"subject": subject, "body": body}

def _generate_sms(name, company, tone):
    if tone == "casual":
        return {"body": f"Hey {name}! Saw what you're doing at {company} - looks awesome. Free for a quick chat?"}
    elif tone == "urgent":
        return {"body": f"{name}, quick q about {company} - do you have 5 mins?"}
    else:
        return {"body": f"Hi {name}, this is [Name] from [MyCompany]. I'd love to discuss how we can help {company}. Do you have a moment?"}

def _generate_linkedin(name, company, title, tone):
    if tone == "casual":
        return {"body": f"Hi {name}, love the work you're doing at {company}. Let's connect!"}
    else:
        return {"body": f"Hello {name}, I've been following {company}'s growth and admire your leadership as {title}. I'd love to connect and share some insights."}

def generate_campaign_content(lead: Lead, instruction: str, type: str) -> dict:
    """
    Simulates AI generation based on specific user instruction.
    In a real app, this would call OpenAI/Gemini with a prompt constructed from instruction + lead info.
    """
    first_name = lead.first_name or "Friend"
    company = lead.company or "your company"
    
    # Simple prompt injection simulation
    generated_body = instruction.replace("{{first_name}}", first_name)\
                                .replace("{{company}}", company)\
                                .replace("{{title}}", lead.title or "Professional")
                                
    # Add some "AI" flavor
    generated_body += f"\n\n(AI Context: I noticed {company} is in {lead.industry or 'tech'} sector.)"
    
    subject = f"Question regarding {company}"
    
    return {"subject": subject, "body": generated_body}

def analyze_sentiment(text: str) -> str:
    """
    Analyzes the sentiment of the provided text.
    Returns 'positive' or 'negative'.
    """
    text_lower = text.lower()
    
    # Simple keyword-based sentiment analysis
    positive_keywords = ["interested", "call me", "yes", "connect", "schedule", "chat", "love to"]
    negative_keywords = ["stop", "unsubscribe", "remove", "not interested", "no thanks", "spam"]
    
    for word in negative_keywords:
        if word in text_lower:
            return "negative"
            
    for word in positive_keywords:
        if word in text_lower:
            return "positive"
            
    # Default to neutral/positive if ambiguous, or could have a 'neutral' state
    return "positive"
