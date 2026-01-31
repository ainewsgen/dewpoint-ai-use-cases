from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    business_type: Optional[str] = "b2b"

class UserCreate(UserBase):
    email: EmailStr
    full_name: str
    password: str

class UserUpdate(UserBase):
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    sms_opt_in: Optional[bool] = None
    email_opt_in: Optional[bool] = None

class User(UserBase):
    id: int
    plan_tier: str
    
    class Config:
        from_attributes = True
