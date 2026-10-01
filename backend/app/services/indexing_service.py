from qdrant_client.models import PointStruct

from app.database import SessionLocal
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.embedding_service import generate_embedding
from app.services.qdrant_service import client, COLLECTION_NAME


def index_document(document_id: int) -> int:
    """
    Generate embeddings for all chunks belonging to a document
    and store them in Qdrant.
    """

    db = SessionLocal()

    try:
        document = (
            db.query(Document)
            .filter(Document.id == document_id)
            .first()
        )

        if not document:
            raise ValueError(
                f"Document with ID {document_id} was not found."
            )

        chunks = (
            db.query(DocumentChunk)
            .filter(
                DocumentChunk.document_id == document_id
            )
            .order_by(
                DocumentChunk.chunk_index
            )
            .all()
        )

        if not chunks:
            raise ValueError(
                f"No chunks found for document ID {document_id}."
            )

        points = []

        for chunk in chunks:

            print(
                f"Generating embedding for chunk "
                f"{chunk.chunk_index + 1}/{len(chunks)}..."
            )

            embedding = generate_embedding(
                chunk.text
            )

            point = PointStruct(
                id=chunk.id,
                vector=embedding,
                payload={
                    "document_id": document.id,
                    "chunk_id": chunk.id,
                    "title": document.title,
                    "department": document.department,
                    "category": document.category,
                    "version": document.version,
                    "chunk_index": chunk.chunk_index,
                    "text": chunk.text,
                },
            )

            points.append(point)

        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points,
        )

        print(
            f"Successfully indexed {len(points)} chunks "
            f"for document ID {document_id}."
        )

        return len(points)

    finally:
        db.close()