from datetime import datetime

from fastapi import APIRouter, Depends

from app.database import SessionLocal
from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.user import User
from app.api.dependencies import require_admin


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


# ---------------------------------------------------------
# Dashboard Statistics
# ---------------------------------------------------------

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(require_admin),
):
    db = SessionLocal()

    try:
        # -------------------------------------------------
        # Document statistics
        # -------------------------------------------------

        total_documents = (
            db.query(Document).count()
        )

        indexed_documents = (
            db.query(Document)
            .filter(
                Document.status == "indexed"
            )
            .count()
        )

        processing_documents = (
            db.query(Document)
            .filter(
                Document.status.in_(
                    [
                        "processing",
                        "uploading",
                    ]
                )
            )
            .count()
        )

        failed_documents = (
            db.query(Document)
            .filter(
                Document.status == "failed"
            )
            .count()
        )

        # -------------------------------------------------
        # Knowledge base statistics
        # -------------------------------------------------

        total_chunks = (
            db.query(DocumentChunk).count()
        )

        # -------------------------------------------------
        # Conversation statistics
        # -------------------------------------------------

        total_conversations = (
            db.query(ChatSession).count()
        )

        total_messages = (
            db.query(ChatMessage).count()
        )

        # -------------------------------------------------
        # Recent document activity
        # -------------------------------------------------

        recent_documents = (
            db.query(Document)
            .order_by(
                Document.uploaded_at.desc()
            )
            .limit(5)
            .all()
        )

        activity = []

        for document in recent_documents:

            if document.status == "indexed":
                action = "Indexed successfully"

            elif document.status == "failed":
                action = "Indexing failed"

            elif document.status in (
                "processing",
                "uploading",
            ):
                action = "Processing document"

            else:
                action = "Document uploaded"

            activity.append(
                {
                    "document": document.filename,
                    "action": action,
                    "time": _format_relative_time(
                        document.uploaded_at
                    ),
                    "status": document.status,
                }
            )

        # -------------------------------------------------
        # Knowledge base health
        # -------------------------------------------------

        if total_documents == 0:
            health_percentage = 0

        else:
            health_percentage = round(
                (
                    indexed_documents
                    / total_documents
                )
                * 100
            )

        # -------------------------------------------------
        # Return dashboard statistics
        # -------------------------------------------------

        return {
            "documents": {
                "total": total_documents,
                "indexed": indexed_documents,
                "processing": processing_documents,
                "failed": failed_documents,
            },
            "knowledge_base": {
                "total_chunks": total_chunks,
                "health_percentage": health_percentage,
            },
            "conversations": {
                "total": total_conversations,
                "total_messages": total_messages,
            },
            "activity": activity,
        }

    finally:
        db.close()


# ---------------------------------------------------------
# Relative Time Helper
# ---------------------------------------------------------

def _format_relative_time(
    timestamp: datetime,
) -> str:

    if timestamp is None:
        return "Unknown time"

    now = datetime.utcnow()

    difference = (
        now - timestamp
    )

    seconds = int(
        difference.total_seconds()
    )

    if seconds < 0:
        return "Just now"

    if seconds < 60:
        return "Just now"

    minutes = seconds // 60

    if minutes < 60:

        if minutes == 1:
            return "1 minute ago"

        return (
            f"{minutes} minutes ago"
        )

    hours = minutes // 60

    if hours < 24:

        if hours == 1:
            return "1 hour ago"

        return (
            f"{hours} hours ago"
        )

    days = hours // 24

    if days < 7:

        if days == 1:
            return "1 day ago"

        return (
            f"{days} days ago"
        )

    return timestamp.strftime(
        "%b %d, %Y"
    )