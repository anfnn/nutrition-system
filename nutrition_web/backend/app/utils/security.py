from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
import hashlib
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings


# Для совместимости с вашим кодом: SHA-256 hex
def hash_password_sha256(password: str) -> str:
    """Хеширование как в вашем UserManagerDB (SHA-256 hex)"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password_sha256(plain: str, hashed: str) -> bool:
    """Проверка пароля"""
    return hash_password_sha256(plain) == hashed


# JWT
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")  # на будущее


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[Dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        return None


# Зависимость для защищённых эндпоинтов
security = HTTPBearer(auto_error=False)


async def get_current_user(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """Получить текущего пользователя из JWT"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Token not provided")

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")

    return {
        "user_id": payload.get("sub"),
        "role": payload.get("role", "user"),
        "full_name": payload.get("full_name")
    }


def require_admin(current_user: Dict = Depends(get_current_user)) -> Dict:
    """Проверка роли администратора"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user