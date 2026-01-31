from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..db.session import get_db
from ..models.template import MessageTemplate

router = APIRouter()

# Pydantic Schemas
class TemplateBase(BaseModel):
    name: str
    type: str
    subject: Optional[str] = None
    body: str

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(TemplateBase):
    pass

class TemplateRead(TemplateBase):
    id: int
    variables: List[str] = []
    created_at: datetime  # Use datetime type, let Pydantic handle serialization
    
    class Config:
        from_attributes = True

# Helper to extract variables
import re
def extract_variables(text: str) -> List[str]:
    # Regex to find {{variable_name}}
    matches = re.findall(r'\{\{([^}]+)\}\}', text)
    return list(set(matches)) # Unique

@router.post("/", response_model=TemplateRead)
def create_template(template: TemplateCreate, db: Session = Depends(get_db)):
    # Auto-extract variables
    variables = extract_variables(template.body)
    if template.subject:
        variables.extend(extract_variables(template.subject))
    
    db_template = MessageTemplate(
        user_id=1,
        name=template.name,
        type=template.type,
        subject=template.subject,
        body=template.body,
        variables=list(set(variables))
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/", response_model=List[TemplateRead])
def read_templates(type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MessageTemplate).filter(MessageTemplate.user_id == 1)
    if type:
        query = query.filter(MessageTemplate.type == type)
    return query.all()

@router.get("/{template_id}", response_model=TemplateRead)
def read_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(MessageTemplate).filter(MessageTemplate.id == template_id, MessageTemplate.user_id == 1).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.put("/{template_id}", response_model=TemplateRead)
def update_template(template_id: int, template: TemplateUpdate, db: Session = Depends(get_db)):
    db_template = db.query(MessageTemplate).filter(MessageTemplate.id == template_id, MessageTemplate.user_id == 1).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    for key, value in template.dict().items():
        setattr(db_template, key, value)
    
    # Re-extract variables
    variables = extract_variables(template.body)
    if template.subject:
        variables.extend(extract_variables(template.subject))
    db_template.variables = list(set(variables))

    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    db_template = db.query(MessageTemplate).filter(MessageTemplate.id == template_id, MessageTemplate.user_id == 1).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(db_template)
    db.commit()
    return {"status": "success"}
