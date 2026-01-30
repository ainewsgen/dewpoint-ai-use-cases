from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db.session import get_db
from ..models.crm import CRMIntegration
from pydantic import BaseModel

router = APIRouter()

class CRMBase(BaseModel):
    crm_type: str
    is_connected: bool = False

class CRMRead(CRMBase):
    id: int
    class Config:
        from_attributes = True

@router.get("/", response_model=List[CRMRead])
def get_integrations(db: Session = Depends(get_db)):
    # MVP: Hardcoded list for UI if DB is empty, otherwise from DB
    crm_list = db.query(CRMIntegration).filter(CRMIntegration.user_id == 1).all()
    if not crm_list:
        # Initial population of options if user visits
        return [
            {"id": 0, "crm_type": "hubspot", "is_connected": False},
            {"id": 0, "crm_type": "salesforce", "is_connected": False},
            {"id": 0, "crm_type": "zoho", "is_connected": False},
            {"id": 0, "crm_type": "pipedrive", "is_connected": False},
        ]
    return crm_list

class ConnectRequest(BaseModel):
    api_key: str = None
    api_secret: str = None
    endpoint: str = None

@router.post("/{crm_type}/connect")
def connect_crm(crm_type: str, request: ConnectRequest = ConnectRequest(), db: Session = Depends(get_db)):
    # Mock connection logic
    integration = db.query(CRMIntegration).filter(
        CRMIntegration.user_id == 1, 
        CRMIntegration.crm_type == crm_type
    ).first()
    
    if not integration:
        integration = CRMIntegration(
            user_id=1, 
            crm_type=crm_type, 
            is_connected=True,
            api_key=request.api_key,
            api_secret=request.api_secret,
            endpoint=request.endpoint
        )
        db.add(integration)
    else:
        integration.is_connected = True
        if request.api_key: integration.api_key = request.api_key
        if request.api_secret: integration.api_secret = request.api_secret
        if request.endpoint: integration.endpoint = request.endpoint
    
    db.commit()
    return {"status": "connected", "crm": crm_type}

@router.post("/{crm_type}/disconnect")
def disconnect_crm(crm_type: str, db: Session = Depends(get_db)):
    integration = db.query(CRMIntegration).filter(
        CRMIntegration.user_id == 1, 
        CRMIntegration.crm_type == crm_type
    ).first()
    
    if integration:
        integration.is_connected = False
        db.commit()
    
    return {"status": "disconnected", "crm": crm_type}
