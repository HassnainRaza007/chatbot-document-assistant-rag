from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams


QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "enterprise_documents"
VECTOR_SIZE = 768


client = QdrantClient(
    url=QDRANT_URL
)


def create_collection():
    """
    Create the Qdrant collection if it does not already exist.
    """

    existing_collections = client.get_collections()

    collection_names = [
        collection.name
        for collection in existing_collections.collections
    ]

    if COLLECTION_NAME in collection_names:
        print(
            f"Collection already exists: {COLLECTION_NAME}"
        )
        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE,
        ),
    )

    print(
        f"Collection created successfully: {COLLECTION_NAME}"
    )