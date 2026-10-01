import requests


OLLAMA_URL = "http://localhost:11434"
EMBEDDING_MODEL = "nomic-embed-text"


def generate_embedding(text: str) -> list[float]:
    """
    Generate a 768-dimensional embedding using Ollama.
    """

    if not text or not text.strip():
        raise ValueError(
            "Cannot generate an embedding for empty text."
        )

    response = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={
            "model": EMBEDDING_MODEL,
            "prompt": text,
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()

    embedding = data.get("embedding")

    if not embedding:
        raise ValueError(
            "Ollama returned no embedding."
        )

    if len(embedding) != 768:
        raise ValueError(
            f"Expected 768 dimensions, "
            f"but received {len(embedding)}."
        )

    return embedding