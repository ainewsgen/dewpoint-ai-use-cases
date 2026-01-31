from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.session import get_db
from ..models.brand import BrandSettings
from ..models.user import User
from pydantic import BaseModel
import shutil
import os
import requests
from bs4 import BeautifulSoup
from collections import Counter
import re

router = APIRouter()

class BrandBase(BaseModel):
    tone_value: int = 50
    length_value: int = 50
    creativity_value: int = 50
    complexity_value: int = 50
    persuasiveness_value: int = 50
    brand_voice: Optional[str] = None
    key_terms: Optional[str] = None
    website_url: Optional[str] = None
    brand_colors: Optional[List[str]] = None
    weight_icp: int = 50
    weight_seniority: int = 50
    weight_intent_website: int = 50
    weight_intent_pricing: int = 50
    weight_intent_demo: int = 50
    weight_intent_content: int = 50
    weight_intent_social: int = 50
    weight_intent_email: int = 50
    # Legacy fields (optional/fallback)
    weight_engagement: Optional[int] = 50
    weight_intent: Optional[int] = 50

class BrandUpdate(BrandBase):
    pass

class DocumentRead(BaseModel):
    name: str
    path: str
    type: str

class BrandRead(BrandBase):
    id: int
    documents: List[DocumentRead] = []
    class Config:
        from_attributes = True

def ensure_default_user_exists(db: Session):
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        # Check if email exists to avoid unique constraint error
        user = db.query(User).filter(User.email == "demo@funnel.ai").first()
        
        if not user:
            user = User(
                id=1,
                email="demo@funnel.ai",
                full_name="John Doe",
                plan_tier="free"
            )
            db.add(user)
            db.commit()
    return user

def get_current_brand_settings(db: Session):
    # MVP: Assume single user (ID 1)
    ensure_default_user_exists(db)
    
    settings = db.query(BrandSettings).filter(BrandSettings.user_id == 1).first()
    if not settings:
        # Create default if not exists
        settings = BrandSettings(user_id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.get("/me", response_model=BrandRead)
def read_brand_settings(db: Session = Depends(get_db)):
    return get_current_brand_settings(db)

@router.put("/me", response_model=BrandRead)
def update_brand_settings(details: BrandUpdate, db: Session = Depends(get_db)):
    settings = get_current_brand_settings(db)
    
    data = details.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(settings, key, value)
    
    db.commit()
    db.refresh(settings)
    return settings

@router.post("/me/documents")
def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    settings = get_current_brand_settings(db)
    
    # Simulate upload
    upload_dir = "uploaded_docs"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Append to JSON list (requires re-assigning for SQLAlchemy change detection)
    current_docs = list(settings.documents) if settings.documents else []
    current_docs.append({
        "name": file.filename,
        "path": file_path,
        "type": file.content_type
    })
    settings.documents = current_docs
    
    db.commit()
    return {"status": "success", "file": file.filename}

@router.delete("/me/documents/{filename}")
def delete_document(filename: str, db: Session = Depends(get_db)):
    settings = get_current_brand_settings(db)
    current_docs = list(settings.documents) if settings.documents else []
    
    # Filter out file
    updated_docs = [d for d in current_docs if d['name'] != filename]
    
    if len(updated_docs) == len(current_docs):
        raise HTTPException(status_code=404, detail="File not found")
        
    settings.documents = updated_docs
    db.commit()
    return {"status": "success"}

@router.post("/extract-colors")
def extract_colors(item: dict):
    url = item.get("url")
    if not url:
        return []
    
    try:
        if not url.startswith('http'):
            url = 'https://' + url
            
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        hex_pattern = re.compile(r'#[a-fA-F0-9]{6}')
        text = soup.get_text() + str(soup)
        colors = hex_pattern.findall(text)
        
        most_common = [c for c, _ in Counter(colors).most_common(5)]
        return most_common
    except Exception as e:
        print(f"Error scraping: {e}")
        return []
