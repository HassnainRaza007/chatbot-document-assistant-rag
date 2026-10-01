from app.services.rag_service import build_rag_context
from app.services.llm_service import generate_answer


query = "How many annual leave days are employees entitled to?"


context, sources = build_rag_context(
    query,
    limit=5,
)


answer = generate_answer(
    question=query,
    context=context,
)


print()
print("=" * 80)
print("QUESTION")
print("=" * 80)
print(query)

print()
print("=" * 80)
print("ANSWER")
print("=" * 80)
print(answer)

print()
print("=" * 80)
print(f"SOURCES USED: {len(sources)}")
print("=" * 80)