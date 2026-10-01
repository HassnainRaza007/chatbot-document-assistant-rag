from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import SessionLocal
from app.models.user import User
from app.services.auth_service import decode_access_token


security = HTTPBearer()


# ---------------------------------------------------------
# Get Current Authenticated User
# ---------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        payload = decode_access_token(token)

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token does not contain a user ID.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    try:
        user_id = int(user_id)

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in authentication token.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    db = SessionLocal()

    try:
        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User associated with this token was not found.",
                headers={
                    "WWW-Authenticate": "Bearer",
                },
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This user account is inactive.",
            )

        return user

    finally:
        db.close()


# ---------------------------------------------------------
# Require Admin-Level Access
#
# Allows:
#   - super_admin
#   - admin (co-admin)
# ---------------------------------------------------------

def require_admin(
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {
        "super_admin",
        "admin",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required.",
        )

    return current_user


# ---------------------------------------------------------
# Require Super Admin Access
#
# Only the main Super Admin can perform
# high-level administration tasks.
# ---------------------------------------------------------

def require_super_admin(
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Administrator access is required.",
        )

    return current_user