from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.database import SessionLocal
from app.models.user import User
from app.services.auth_service import (
    create_access_token,
    verify_password,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# ---------------------------------------------------------
# Request Schema
# ---------------------------------------------------------

class LoginRequest(BaseModel):
    username: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    password: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )


# ---------------------------------------------------------
# Response Schema
# ---------------------------------------------------------

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


# ---------------------------------------------------------
# Login Endpoint
# ---------------------------------------------------------

@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    request: LoginRequest,
):
    db = SessionLocal()

    try:

        # -------------------------------------------------
        # Find user
        # -------------------------------------------------

        user = (
            db.query(User)
            .filter(
                User.username == request.username
            )
            .first()
        )

        # -------------------------------------------------
        # Validate credentials
        # -------------------------------------------------

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account is inactive.",
            )

        if not verify_password(
            request.password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )

        # -------------------------------------------------
        # Create JWT token
        # -------------------------------------------------

        access_token = create_access_token(
            user_id=user.id,
            username=user.username,
            role=user.role,
        )

        # -------------------------------------------------
        # Return authenticated user
        # -------------------------------------------------

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            },
        }

    finally:
        db.close()