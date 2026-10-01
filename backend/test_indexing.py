from app.services.indexing_service import index_document


indexed_count = index_document(4)

print(f"Indexed chunks: {indexed_count}")