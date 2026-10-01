from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.user import User

from app.services.document_parser import extract_text
from app.services.document_chunker import chunk_document
from app.services.indexing_service import index_document

from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.dashboard import router as dashboard_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router

from app.api.dependencies import (
    get_current_user,
    require_admin,
)


app = FastAPI(
    title="Enterprise AI Assistant API",
    description="Backend API for the Enterprise AI Knowledge Assistant",
    version="1.0.0",
)


# ---------------------------------------------------------
# Database
# ---------------------------------------------------------

Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# API Routers
# ---------------------------------------------------------

app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(dashboard_router)
app.include_router(auth_router)
app.include_router(users_router)


# ---------------------------------------------------------
# Root Endpoint
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Enterprise AI Assistant API is running"
    }


# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# ---------------------------------------------------------
# Authentication Test Endpoints
# ---------------------------------------------------------

@app.get(
    "/api/auth/me",
    tags=["Authentication"],
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }


@app.get(
    "/api/auth/admin-test",
    tags=["Authentication"],
)
def admin_test(
    current_user: User = Depends(require_admin),
):
    return {
        "message": "Admin authentication successful.",
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role,
        },
    }


# ---------------------------------------------------------
# Document Upload Configuration
# ---------------------------------------------------------

DOCUMENTS_DIR = Path("documents")

DOCUMENTS_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
    ".md",
}


# ---------------------------------------------------------
# Document Upload Endpoint
# ---------------------------------------------------------

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    department: str = Form(...),
    category: str = Form(...),
    version: str = Form("1.0"),
    description: str = Form(""),
    current_user: User = Depends(require_admin),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was provided",
        )

    extension = Path(
        file.filename
    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed: PDF, DOCX, TXT, MD"
            ),
        )

    safe_filename = Path(
        file.filename
    ).name

    file_path = (
        DOCUMENTS_DIR / safe_filename
    )

    file_content = await file.read()

    try:

        # -------------------------------------------------
        # 1. Save original document
        # -------------------------------------------------

        file_path.write_bytes(
            file_content
        )

        # -------------------------------------------------
        # 2. Extract text
        # -------------------------------------------------

        extracted_text = extract_text(
            str(file_path)
        )

        if not extracted_text:

            if file_path.exists():
                file_path.unlink()

            raise HTTPException(
                status_code=400,
                detail=(
                    "No readable text was found "
                    "in the uploaded document."
                ),
            )

        # -------------------------------------------------
        # 3. Create database session
        # -------------------------------------------------

        db = SessionLocal()

        try:

            # ---------------------------------------------
            # 4. Save document metadata + extracted text
            # ---------------------------------------------

            document = Document(
                filename=file.filename,
                title=title,
                department=department,
                category=category,
                version=version,
                description=description,
                text_content=extracted_text,
                file_size=len(file_content),
                content_type=file.content_type,
                file_path=str(file_path),
                status="text_extracted",
            )

            db.add(document)
            db.commit()
            db.refresh(document)

            # ---------------------------------------------
            # 5. Create intelligent chunks
            # ---------------------------------------------

            chunks = chunk_document(
                extracted_text
            )

            if not chunks:

                document.status = (
                    "chunking_failed"
                )

                db.commit()

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Document text was extracted, "
                        "but no chunks could be created."
                    ),
                )

            # ---------------------------------------------
            # 6. Save chunks
            # ---------------------------------------------

            for (
                chunk_index,
                chunk_text,
            ) in enumerate(chunks):

                document_chunk = DocumentChunk(
                    document_id=document.id,
                    chunk_index=chunk_index,
                    text=chunk_text,
                )

                db.add(document_chunk)

            # ---------------------------------------------
            # 7. Update document status
            # ---------------------------------------------

            document.status = "chunked"

            db.commit()

            # ---------------------------------------------
            # 8. Generate embeddings and index in Qdrant
            # ---------------------------------------------

            try:

                indexed_count = index_document(
                    document.id
                )

            except Exception as error:

                document.status = "indexing_failed"

                db.commit()

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Document was uploaded and chunked, "
                        "but vector indexing failed: "
                        f"{str(error)}"
                    ),
                )

            # ---------------------------------------------
            # 9. Mark document as indexed
            # ---------------------------------------------

            document.status = "indexed"

            db.commit()

            return {
                "message": (
                    "Document uploaded, text extracted, "
                    "chunks created, and indexed successfully"
                ),
                "document": {
                    "id": document.id,
                    "filename": document.filename,
                    "title": document.title,
                    "department": document.department,
                    "category": document.category,
                    "version": document.version,
                    "description": document.description,
                    "text_length": len(
                        document.text_content
                    ),
                    "chunk_count": len(chunks),
                    "indexed_chunk_count": indexed_count,
                    "file_size": document.file_size,
                    "content_type": document.content_type,
                    "file_path": document.file_path,
                    "status": document.status,
                    "uploaded_at": document.uploaded_at,
                },
            }

        # ---------------------------------------------
        # 10. Handle processing errors
        # ---------------------------------------------

        except HTTPException:
            db.rollback()
            raise

        except Exception as error:

            db.rollback()

            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to process document: "
                    f"{str(error)}"
                ),
            )

        finally:
            db.close()

    except HTTPException:
        raise

    except Exception as error:

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to process uploaded document: "
                f"{str(error)}"
            ),
        )