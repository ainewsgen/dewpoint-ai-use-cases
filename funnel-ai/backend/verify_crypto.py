from app.core.security import get_password_hash, verify_password

try:
    pwd = "test123"
    hashed = get_password_hash(pwd)
    print(f"Hash success: {hashed}")
    valid = verify_password(pwd, hashed)
    print(f"Verify success: {valid}")
except Exception as e:
    print(f"Error: {e}")
