from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.user import User
from ..core.security import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from pydantic import BaseModel

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # ... (existing login logic) ...
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

from pydantic import EmailStr
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    try:
        print(f"DEBUG: Processing forgot password for {request.email}")
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            print("DEBUG: User not found")
            return {"message": "If this email exists, a reset link has been sent."}
        
        print("DEBUG: Generating token...")
        access_token_expires = timedelta(minutes=15)
        reset_token = create_access_token(
            data={"sub": user.email, "type": "reset"}, 
            expires_delta=access_token_expires
        )
        
        reset_link = f"http://localhost:5173/reset-password?token={reset_token}"
        print(f"\n[MVP] PASSWORD RESET LINK FOR {user.email}: {reset_link}\n")
        
        return {"message": "If this email exists, a reset link has been sent."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR in forgot_password: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

from jose import JWTError, jwt
from ..core.security import SECRET_KEY, ALGORITHM, get_password_hash

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(request.token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "reset":
            raise HTTPException(status_code=400, detail="Invalid token")
            
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}
