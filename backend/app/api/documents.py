from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from qdrant_client.models import Filter, FieldCondition, MatchValue

from app.database import SessionLocal
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.user import User
from app.services.indexing_service import index_document
from app.services.qdrant_service import (
    client,
    COLLECTION_NAME,
)
from app.api.dependencies import (
    get_current_user,
    require_admin,
)


router = APIRouter(
    prefix="/api/documents",
    tags=["Documents"],
)


# ---------------------------------------------------------
# Get Documents
# ---------------------------------------------------------

@router.get("")
async def get_documents(
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    try:
        documents = (
            db.query(Document)
            .order_by(Document.uploaded_at.desc())
            .all()
        )

        return [
            {
                "id": document.id,
                "filename": document.filename,
                "title": document.title,
                "department": document.department,
                "category": document.category,
                "version": document.version,
                "description": document.description,
                "file_size": document.file_size,
                "content_type": document.content_type,
                "status": document.status,
                "uploaded_at": document.uploaded_at,
            }
            for document in documents
        ]

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load documents: {str(error)}",
        )

    finally:
        db.close()


# ---------------------------------------------------------
# Re-index Document
# ---------------------------------------------------------

@router.post("/{document_id}/reindex")
async def reindex_document(
    document_id: int,
    current_user: User = Depends(require_admin),
):
    db = SessionLocal()

    try:
        # 1. Find the document
        document = (
            db.query(Document)
            .filter(Document.id == document_id)
            .first()
        )

        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found.",
            )

        # 2. Check that the document has chunks
        chunk_count = (
            db.query(DocumentChunk)
            .filter(
                DocumentChunk.document_id == document.id
            )
            .count()
        )

        if chunk_count == 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Document cannot be re-indexed because "
                    "it has no document chunks."
                ),
            )

        # 3. Mark document as indexing
        document.status = "indexing"
        db.commit()

        # 4. Regenerate embeddings and upsert
        #    the vectors into Qdrant
        try:
            indexed_count = index_document(document.id)

        except Exception as error:
            document.status = "indexing_failed"
            db.commit()

            raise HTTPException(
                status_code=500,
                detail=(
                    "Document re-indexing failed: "
                    f"{str(error)}"
                ),
            )

        # 5. Mark document as indexed
        document.status = "indexed"
        db.commit()

        return {
            "message": "Document re-indexed successfully.",
            "document_id": document.id,
            "filename": document.filename,
            "chunks_indexed": indexed_count,
            "status": document.status,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to re-index document: "
                f"{str(error)}"
            ),
        )

    finally:
        db.close()


# ---------------------------------------------------------
# Delete Document
# ---------------------------------------------------------

@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(require_admin),
):
    db = SessionLocal()

    try:
        # 1. Find the document
        document = (
            db.query(Document)
            .filter(Document.id == document_id)
            .first()
        )

        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found.",
            )

        # 2. Delete vectors from Qdrant
        try:
            client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(
                                value=document.id
                            ),
                        )
                    ]
                ),
            )

        except Exception as error:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to delete document vectors "
                    f"from Qdrant: {str(error)}"
                ),
            )

        # 3. Delete document chunks
        db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document.id
        ).delete(
            synchronize_session=False
        )

        # 4. Delete uploaded file only if
        #    no other document uses the same file
        other_document = (
            db.query(Document)
            .filter(
                Document.file_path == document.file_path,
                Document.id != document.id,
            )
            .first()
        )

        if not other_document:
            file_path = Path(document.file_path)

            if file_path.exists():
                file_path.unlink()

        # 5. Delete document from database
        db.delete(document)
        db.commit()

        return {
            "message": "Document deleted successfully.",
            "document_id": document_id,
            "filename": document.filename,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(error)}",
        )

    finally:
        db.close()