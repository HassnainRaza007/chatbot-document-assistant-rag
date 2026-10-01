from app.services.rag_service import build_rag_context


query = "How many annual leave days are employees entitled to?"

context, results = build_rag_context(
    query,
    limit=5,
)

print()
print("=" * 80)
print("RAG CONTEXT")
print("=" * 80)

print(context)

print()
print("=" * 80)
print(f"RETRIEVED SOURCES: {len(results)}")
print("=" * 80)