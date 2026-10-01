from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func

from app.database import SessionLocal
from app.models.user import User
from app.services.auth_service import hash_password
from app.api.dependencies import (
    get_current_user,
    require_admin,
    require_super_admin,
)


router = APIRouter(
    prefix="/api/users",
    tags=["User Management"],
)


# ---------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------

class UserCreateRequest(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=100,
    )

    email: str = Field(
        min_length=3,
        max_length=255,
    )

    password: str = Field(
        min_length=8,
        max_length=100,
    )

    role: str = Field(
        default="user",
    )

    is_active: bool = True


class UserUpdateRequest(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=100,
    )

    email: str = Field(
        min_length=3,
        max_length=255,
    )

    role: str = Field(
        default="user",
    )

    is_active: bool = True

    password: str | None = Field(
        default=None,
        min_length=8,
        max_length=100,
    )


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool


# ---------------------------------------------------------
# Role Validation
# ---------------------------------------------------------

def validate_role(role: str):
    if role not in {
        "user",
        "admin",
        "super_admin",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Role must be 'user', 'admin', "
                "or 'super_admin'."
            ),
        )


# ---------------------------------------------------------
# Check Whether Current Admin Can Manage Target User
# ---------------------------------------------------------

def ensure_user_management_permission(
    current_admin: User,
    target_user: User,
    requested_role: str | None = None,
):
    # -----------------------------------------------------
    # Super Admin cannot be modified by anyone.
    # -----------------------------------------------------

    if target_user.role == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The Super Administrator account cannot be modified.",
        )

    # -----------------------------------------------------
    # Co-Admins can only manage normal users.
    # -----------------------------------------------------

    if current_admin.role == "admin":

        if target_user.role != "user":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Co-Administrators can only manage "
                    "normal users."
                ),
            )

        if requested_role is not None and requested_role != "user":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Only the Super Administrator can "
                    "manage Co-Administrator roles."
                ),
            )


# ---------------------------------------------------------
# Get All Users
# ---------------------------------------------------------

@router.get("")
def get_users(
    current_admin: User = Depends(require_admin),
):
    db = SessionLocal()

    try:
        users = (
            db.query(User)
            .order_by(User.id.asc())
            .all()
        )

        return [
            UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role,
                is_active=user.is_active,
            )
            for user in users
        ]

    finally:
        db.close()


# ---------------------------------------------------------
# Create User
# ---------------------------------------------------------

@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    request: UserCreateRequest,
    current_admin: User = Depends(require_admin),
):
    validate_role(request.role)

    # -----------------------------------------------------
    # Only Super Admin can create:
    # - Co-Admins
    # - Super Admin accounts
    #
    # In normal operation, a second Super Admin should
    # never be created. We enforce exactly one below.
    # -----------------------------------------------------

    if (
        current_admin.role == "admin"
        and request.role != "user"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the Super Administrator can "
                "create Co-Administrators."
            ),
        )

    if request.role == "super_admin":
        db = SessionLocal()

        try:
            existing_super_admin = (
                db.query(User)
                .filter(
                    User.role == "super_admin"
                )
                .first()
            )

            if existing_super_admin:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "A Super Administrator already exists. "
                        "Only one Super Administrator is allowed."
                    ),
                )

        finally:
            db.close()

    db = SessionLocal()

    try:
        # -------------------------------------------------
        # Duplicate username check
        # -------------------------------------------------

        existing_username = (
            db.query(User)
            .filter(
                func.lower(User.username)
                == request.username.lower()
            )
            .first()
        )

        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists.",
            )

        # -------------------------------------------------
        # Duplicate email check
        # -------------------------------------------------

        existing_email = (
            db.query(User)
            .filter(
                func.lower(User.email)
                == request.email.lower()
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists.",
            )

        # -------------------------------------------------
        # Create user
        # -------------------------------------------------

        user = User(
            username=request.username.strip(),
            email=request.email.lower().strip(),
            password_hash=hash_password(
                request.password
            ),
            role=request.role,
            is_active=request.is_active,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
        )

    finally:
        db.close()


# ---------------------------------------------------------
# Update User
# ---------------------------------------------------------

@router.put(
    "/{user_id}",
    response_model=UserResponse,
)
def update_user(
    user_id: int,
    request: UserUpdateRequest,
    current_admin: User = Depends(require_admin),
):
    validate_role(request.role)

    db = SessionLocal()

    try:
        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        # -------------------------------------------------
        # Super Admin cannot be modified.
        # -------------------------------------------------

        if user.role == "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "The Super Administrator account "
                    "cannot be modified."
                ),
            )

        # -------------------------------------------------
        # Co-Admin restrictions
        # -------------------------------------------------

        ensure_user_management_permission(
            current_admin=current_admin,
            target_user=user,
            requested_role=request.role,
        )

        # -------------------------------------------------
        # Only Super Admin can assign super_admin role.
        # -------------------------------------------------

        if request.role == "super_admin":

            if current_admin.role != "super_admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "Only the Super Administrator can "
                        "manage the Super Administrator role."
                    ),
                )

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "The existing Super Administrator "
                    "cannot be replaced through this operation."
                ),
            )

        # -------------------------------------------------
        # Check for duplicate username
        # -------------------------------------------------

        existing_username = (
            db.query(User)
            .filter(
                func.lower(User.username)
                == request.username.lower(),
                User.id != user_id,
            )
            .first()
        )

        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists.",
            )

        # -------------------------------------------------
        # Check for duplicate email
        # -------------------------------------------------

        existing_email = (
            db.query(User)
            .filter(
                func.lower(User.email)
                == request.email.lower(),
                User.id != user_id,
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists.",
            )

        # -------------------------------------------------
        # Co-Admin can only keep target as normal user.
        # -------------------------------------------------

        if (
            current_admin.role == "admin"
            and request.role != "user"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Co-Administrators cannot assign "
                    "administrator roles."
                ),
            )

        # -------------------------------------------------
        # Update user information
        # -------------------------------------------------

        user.username = request.username.strip()

        user.email = (
            request.email.lower().strip()
        )

        user.role = request.role

        user.is_active = request.is_active

        # -------------------------------------------------
        # Update password only when supplied
        # -------------------------------------------------

        if request.password:
            user.password_hash = hash_password(
                request.password
            )

        db.commit()
        db.refresh(user)

        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
        )

    finally:
        db.close()


# ---------------------------------------------------------
# Delete User
# ---------------------------------------------------------

@router.delete(
    "/{user_id}",
)
def delete_user(
    user_id: int,
    current_admin: User = Depends(require_admin),
):
    db = SessionLocal()

    try:
        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        # -------------------------------------------------
        # Super Admin can never be deleted.
        # -------------------------------------------------

        if user.role == "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "The Super Administrator account "
                    "cannot be deleted."
                ),
            )

        # -------------------------------------------------
        # Co-Admins cannot delete other administrators.
        # -------------------------------------------------

        ensure_user_management_permission(
            current_admin=current_admin,
            target_user=user,
        )

        # -------------------------------------------------
        # Delete user
        # -------------------------------------------------

        db.delete(user)
        db.commit()

        return {
            "message": "User deleted successfully.",
            "user_id": user_id,
        }

    finally:
        db.close()