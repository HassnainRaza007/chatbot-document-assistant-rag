from app.database import SessionLocal
from app.models.user import User
from app.services.auth_service import hash_password


# ---------------------------------------------------------
# Admin Account Configuration
# ---------------------------------------------------------

USERNAME = "admin"
EMAIL = "admin@enterprise.local"
PASSWORD = "Admin@12345"


# ---------------------------------------------------------
# Create Admin User
# ---------------------------------------------------------

db = SessionLocal()

try:
    existing_user = (
        db.query(User)
        .filter(User.username == USERNAME)
        .first()
    )

    if existing_user:
        print(
            f"User '{USERNAME}' already exists."
        )

    else:
        admin_user = User(
            username=USERNAME,
            email=EMAIL,
            password_hash=hash_password(PASSWORD),
            role="admin",
            is_active=True,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("Admin user created successfully.")
        print(f"ID: {admin_user.id}")
        print(f"Username: {admin_user.username}")
        print(f"Email: {admin_user.email}")
        print(f"Role: {admin_user.role}")

finally:
    db.close()