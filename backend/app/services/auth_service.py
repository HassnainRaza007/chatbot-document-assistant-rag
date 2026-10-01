import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash


# ---------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------

load_dotenv()


# ---------------------------------------------------------
# JWT Configuration
# ---------------------------------------------------------

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY"
)

ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256",
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
        "60",
    )
)


# ---------------------------------------------------------
# Validate required configuration
# ---------------------------------------------------------

if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not configured. "
        "Please add JWT_SECRET_KEY to the .env file."
    )


# ---------------------------------------------------------
# Password Hashing
# ---------------------------------------------------------

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    if not password:
        raise ValueError(
            "Password cannot be empty."
        )

    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:

    if not plain_password or not hashed_password:
        return False

    return password_hash.verify(
        plain_password,
        hashed_password,
    )


# ---------------------------------------------------------
# JWT Token Creation
# ---------------------------------------------------------

def create_access_token(
    user_id: int,
    username: str,
    role: str,
) -> str:

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


# ---------------------------------------------------------
# JWT Token Validation
# ---------------------------------------------------------

def decode_access_token(
    token: str,
) -> dict:

    try:

        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

    except jwt.ExpiredSignatureError:

        raise ValueError(
            "Authentication token has expired."
        )

    except jwt.InvalidTokenError:

        raise ValueError(
            "Invalid authentication token."
        )