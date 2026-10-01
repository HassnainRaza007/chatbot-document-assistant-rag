from app.services.llm_service import generate_answer
from app.services.rag_service import build_rag_context


def answer_question(
    question: str,
    limit: int = 5,
) -> dict:
    """
    Retrieve relevant knowledge, generate a grounded answer,
    and return the answer together with authoritative sources.
    """

    if not question or not question.strip():
        raise ValueError(
            "Question cannot be empty."
        )

    context, results = build_rag_context(
        question,
        limit=limit,
    )

    if not results:
        return {
            "answer": (
                "I don't have enough information in the "
                "knowledge base to answer that."
            ),
            "sources": [],
        }

    answer = generate_answer(
        question=question,
        context=context,
    )

    sources = []

    for index, result in enumerate(
        results,
        start=1,
    ):
        sources.append(
            {
                "source_number": index,
                "document_id": result["document_id"],
                "chunk_id": result["chunk_id"],
                "title": result["title"],
                "department": result["department"],
                "category": result["category"],
                "version": result["version"],
                "chunk_index": result["chunk_index"],
            }
        )

    return {
        "answer": answer,
        "sources": sources,
    }