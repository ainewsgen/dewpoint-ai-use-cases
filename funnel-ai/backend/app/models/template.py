from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from ..db.session import Base

class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1) # MVP: Single user
    name = Column(String, index=True)
    type = Column(String)  # email, sms, linkedin
    subject = Column(String, nullable=True) # Only for email
    body = Column(Text, nullable=False)
    variables = Column(JSON, default=[]) # List of extracted variables e.g. ['first_name']

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
