from app.services.retrieval_service import search_documents


def build_rag_context(
    query: str,
    limit: int = 5,
) -> tuple[str, list[dict]]:
    """
    Retrieve relevant document chunks and build
    a structured context string for the LLM.
    """

    results = search_documents(
        query,
        limit=limit,
    )

    if not results:
        return "", []

    context_parts = []

    for index, result in enumerate(
        results,
        start=1,
    ):

        context_parts.append(
            f"""SOURCE {index}
Document: {result["title"]}
Department: {result["department"]}
Category: {result["category"]}
Version: {result["version"]}
Chunk: {result["chunk_index"]}

Content:
{result["text"]}
"""
        )

    context = "\n\n".join(
        context_parts
    )

    return context, results