from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
from jose import jwt, JWTError
from ..db.session import get_db
from ..models.user import User
from ..core.security import get_password_hash, SECRET_KEY, ALGORITHM
from pydantic import BaseModel

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

class UserBase(BaseModel):
    email: str
    full_name: str
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    sms_opt_in: bool = False
    email_opt_in: bool = True
    ebilling_opt_in: bool = True
    business_type: str = "b2b"

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    pass

class PlanUpdate(BaseModel):
    plan_tier: str
    client_timestamp: Optional[str] = None

# Secure dependency
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        print(f"DEBUG: Registering {user.email}")
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = get_password_hash(user.password)
        new_user = User(
            email=user.email,
            full_name=user.full_name,
            hashed_password=hashed_password,
            phone=user.phone,
            business_type=user.business_type
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print("DEBUG: Registration Success")
        return new_user
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me")
def update_me(user_update: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for var, value in vars(user_update).items():
        if value is not None:
            setattr(current_user, var, value)
    db.commit()
    db.refresh(current_user)
    return current_user

# ... (UserRead class remains same) ...

@router.post("/me/upgrade")
def upgrade_plan(plan: PlanUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = current_user
    old_tier = user.plan_tier
    new_tier = plan.plan_tier
    
    # Determine action type (Simple logic: Free=0, Pro=1, Enterprise=2)
    tiers = ["free", "pro", "enterprise"]
    try:
        old_idx = tiers.index(old_tier) if old_tier in tiers else 0
        new_idx = tiers.index(new_tier) if new_tier in tiers else 0
        action = "UPGRADE" if new_idx > old_idx else "DOWNGRADE"
    except:
        action = "CHANGE"

    # Record History
    from ..models.subscription_history import SubscriptionHistory
    history = SubscriptionHistory(
        user_id=user.id,
        from_tier=old_tier,
        to_tier=new_tier,
        action_type=action,
        client_timestamp=None, # In real app parse iso string
        authorization_text="I authorize Funnel.ai to change my subscription plan."
    )
    db.add(history)
    
    # Update User
    user.plan_tier = new_tier
    db.commit()
    
    # Trigger notification
    from ..models.notification import Notification
    db.add(Notification(
        type="success",
        title=f"Plan {action.title()}d!",
        message=f"You have successfully {action.lower()}d to the {new_tier.upper()} plan."
    ))
    db.commit()
    
    return {"status": "success", "new_plan": user.plan_tier, "action": action}
