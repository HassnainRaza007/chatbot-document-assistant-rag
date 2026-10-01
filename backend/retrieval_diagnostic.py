from app.services.embedding_service import generate_embedding
from app.services.qdrant_service import client, COLLECTION_NAME

queries = [
    "How many annual leaves?",
    "What should an employee do in an emergency abroad?",
    "What happens if an employee violates the travel policy?",
    "Who receives a corporate credit card?",
    "How far in advance is travel booking encouraged?",
]

for query in queries:
    print("\n" + "=" * 100)
    print("QUERY:", query)
    print("-" * 100)

    embedding = generate_embedding(query)

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=embedding,
        limit=10,
        with_payload=True,
    ).points

    for result in results:
        payload = result.payload or {}

        print(
            f"SCORE: {result.score:.4f} | "
            f"CHUNK: {payload.get('chunk_id')} | "
            f"INDEX: {payload.get('chunk_index')} | "
            f"TITLE: {payload.get('title')}"
        )

        print(payload.get("text", "")[:800])
        print("-" * 100)