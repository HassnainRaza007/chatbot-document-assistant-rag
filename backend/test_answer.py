from app.services.answer_service import answer_question


question = "What is the company's laptop replacement policy?"


result = answer_question(
    question,
    limit=5,
)


print()
print("=" * 80)
print("ANSWER")
print("=" * 80)
print(result["answer"])

print()
print("=" * 80)
print("SOURCES")
print("=" * 80)

for source in result["sources"]:

    print()
    print(
        f"Source {source['source_number']}"
    )

    print(
        f"Document: {source['title']}"
    )

    print(
        f"Department: {source['department']}"
    )

    print(
        f"Category: {source['category']}"
    )

    print(
        f"Version: {source['version']}"
    )

    print(
        f"Chunk: {source['chunk_index']}"
    )