from app.services.embedding_service import generate_embedding
from app.services.qdrant_service import client, COLLECTION_NAME


SIMILARITY_THRESHOLD = 0.50


def search_documents(
    query: str,
    limit: int = 5,
) -> list[dict]:
    """
    Search Qdrant for document chunks that are
    semantically similar to the user's query.

    Results below the similarity threshold are ignored
    so unrelated documents are not treated as authoritative
    knowledge-base sources.
    """

    if not query or not query.strip():
        raise ValueError(
            "Search query cannot be empty."
        )

    query_embedding = generate_embedding(
        query
    )

    search_results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=limit,
        with_payload=True,
    ).points

    results = []

    for result in search_results:

        # Ignore weak semantic matches.
        if result.score < SIMILARITY_THRESHOLD:
            continue

        payload = result.payload or {}

        results.append(
            {
                "score": result.score,
                "document_id": payload.get(
                    "document_id"
                ),
                "chunk_id": payload.get(
                    "chunk_id"
                ),
                "title": payload.get(
                    "title"
                ),
                "department": payload.get(
                    "department"
                ),
                "category": payload.get(
                    "category"
                ),
                "version": payload.get(
                    "version"
                ),
                "chunk_index": payload.get(
                    "chunk_index"
                ),
                "text": payload.get(
                    "text"
                ),
            }
        )

    return results