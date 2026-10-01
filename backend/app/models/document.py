from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    department: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="1.0",
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    text_content: Mapped[str | None] = mapped_column(
    Text,
    nullable=True,
    )

    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    content_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="uploaded",
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )