from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Any
from ..db.session import get_db
from ..models.log import AccessLog
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class LogRead(BaseModel):
    id: int
    method: str
    path: str
    status_code: int
    duration_ms: float
    timestamp: datetime
    class Config:
        from_attributes = True

@router.get("/logs", response_model=List[LogRead])
def read_logs(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(AccessLog).order_by(AccessLog.timestamp.desc()).limit(limit).all()

@router.get("/stats")
def read_stats(db: Session = Depends(get_db)):
    # Total Requests
    total = db.query(func.count(AccessLog.id)).scalar()
    
    # Average Latency
    avg_latency = db.query(func.avg(AccessLog.duration_ms)).scalar() or 0
    
    # Error Rate (Status >= 400)
    errors = db.query(func.count(AccessLog.id)).filter(AccessLog.status_code >= 400).scalar()
    
    return {
        "total_requests": total,
        "avg_latency_ms": round(avg_latency, 2),
        "error_count": errors,
        "error_rate": round((errors / total * 100) if total > 0 else 0, 2)
    }
