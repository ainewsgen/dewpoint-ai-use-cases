from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from ..db.session import Base

class BrandSettings(Base):
    __tablename__ = "brand_settings_v4"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # AI Tuning Sliders (0-100)
    tone_value = Column(Integer, default=50) # 0=Casual, 100=Formal
    length_value = Column(Integer, default=50) # 0=Concise, 100=Detailed
    creativity_value = Column(Integer, default=50) # 0=Strict, 100=Creative
    complexity_value = Column(Integer, default=50) # 0=Simple, 100=Sophisticated
    persuasiveness_value = Column(Integer, default=50) # 0=Informational, 100=Promotional
    
    # Brand Identity
    brand_voice = Column(Text, nullable=True) # e.g. "Professional, empathetic, and data-driven"
    key_terms = Column(Text, nullable=True) # Comma-separated
    
    # Brand Assets
    website_url = Column(String, nullable=True)
    brand_colors = Column(JSON, nullable=True) # List of hex codes e.g. ["#ffffff", "#000000"]

    # Knowledge Base
    documents = Column(JSON, default=[]) # List of {name, path, type}
    
    # Scoring Weights (0-100)
    weight_icp = Column(Integer, default=50)
    weight_seniority = Column(Integer, default=50)
    
    # Expanded Intent Signals
    weight_intent_website = Column(Integer, default=50)
    weight_intent_pricing = Column(Integer, default=50)
    weight_intent_demo = Column(Integer, default=50)
    weight_intent_content = Column(Integer, default=50)
    weight_intent_social = Column(Integer, default=50)
    weight_intent_email = Column(Integer, default=50)

    # Legacy (will migrate or keep as fallback)
    weight_engagement = Column(Integer, default=50)
    weight_intent = Column(Integer, default=50)

    user = relationship("User")
