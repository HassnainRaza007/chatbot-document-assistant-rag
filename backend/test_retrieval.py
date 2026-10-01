from app.services.retrieval_service import search_documents


query = "How many annual leave days are employees entitled to?"

results = search_documents(
    query,
    limit=5,
)

print()
print("=" * 80)
print("SEARCH RESULTS")
print("=" * 80)

for index, result in enumerate(results, start=1):

    print()
    print(f"RESULT {index}")
    print("-" * 80)
    print(f"Score: {result['score']}")
    print(f"Document: {result['title']}")
    print(f"Department: {result['department']}")
    print(f"Category: {result['category']}")
    print(f"Version: {result['version']}")
    print(f"Chunk ID: {result['chunk_id']}")
    print(f"Chunk Index: {result['chunk_index']}")
    print()
    print(result["text"])