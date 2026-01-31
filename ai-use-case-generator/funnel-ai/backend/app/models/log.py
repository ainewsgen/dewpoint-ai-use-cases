from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from ..db.session import Base

class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    method = Column(String, index=True)
    path = Column(String, index=True)
    status_code = Column(Integer, index=True)
    duration_ms = Column(Float)
    ip_address = Column(String, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
