import uuid
import asyncio
from app.db.database import init_db, get_db
from app.api.ingest import process_ingest_background
from app.db.repository import ItemRepository

SAMPLE_ITEMS = [
    {
        "type": "note",
        "title": "SQLite Production Concurrency & WAL Mode",
        "content": (
            "SQLite supports high-concurrency read workloads when Write-Ahead Logging (WAL) mode is enabled. "
            "Under WAL mode, readers do not block writers, and a writer does not block readers. "
            "However, SQLite uses database-level locking for writes: only one process or thread can write to the database at any instant. "
            "For write-heavy applications with high sustained throughput, this lock contention leads to SQLITE_BUSY timeouts. "
            "Best practice: Keep transactions short, use busy_timeout handlers, and consider client-side write queuing."
        ),
    },
    {
        "type": "note",
        "title": "RAG Chunking Strategies and Tradeoffs",
        "content": (
            "Chunking text is a fundamental design decision in Retrieval-Augmented Generation (RAG). "
            "Fixed-size character chunking with overlap (e.g., 600 chars with 100 char overlap) is fast, deterministic, "
            "and ensures that sentences spanning arbitrary character cutoffs remain semantically connected. "
            "The tradeoff is that fixed chunking does not respect semantic shifts or document layouts like tables and headers. "
            "At production scale, semantic chunking or AST-based layout chunking provides higher precision retrieval, "
            "though it incurs extra compute during ingestion."
        ),
    },
    {
        "type": "note",
        "title": "Vector Databases vs Embedded Vector Search",
        "content": (
            "For small-to-medium knowledge bases (< 50,000 documents), embedded vector search using SQLite with serialized "
            "vector BLOBs and vectorized NumPy cosine similarity delivers sub-10ms queries with zero infrastructure overhead. "
            "Reviewers and single-user apps do not need external daemon setups like Pinecone or Qdrant. "
            "However, at scale (> 100,000 vectors), linear brute-force scan becomes O(N*D), causing latency degradation. "
            "Production scaling requires dedicated Approximate Nearest Neighbor (ANN) indexes such as HNSW or IVFFlat."
        ),
    },
]


def cleanup_duplicate_items():
    """Removes duplicate items keeping only the earliest one for each title."""
    with get_db() as conn:
        cursor = conn.execute("SELECT id, title, created_at FROM items ORDER BY created_at ASC")
        seen_titles = set()
        duplicates_to_delete = []
        for row in cursor.fetchall():
            title = row["title"].strip().lower()
            if title in seen_titles:
                duplicates_to_delete.append(row["id"])
            else:
                seen_titles.add(title)

        for dup_id in duplicates_to_delete:
            ItemRepository.delete_item(dup_id)
        if duplicates_to_delete:
            print(f"Cleaned up {len(duplicates_to_delete)} duplicate item(s).")


async def seed_data():
    print("Initializing database...")
    init_db()

    # First clean up any existing duplicates
    cleanup_duplicate_items()

    with get_db() as conn:
        for item_data in SAMPLE_ITEMS:
            # Deterministic UUID for each seed item
            item_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, item_data["title"]))

            # Check if an item with this UUID or title already exists
            row = conn.execute(
                "SELECT id FROM items WHERE id = ? OR title = ?",
                (item_uuid, item_data["title"]),
            ).fetchone()

            if row:
                print(f"Skipping '{item_data['title']}': already exists (id={row['id']}).")
                continue

            print(f"Ingesting sample with UUID ({item_uuid}): '{item_data['title']}'...")
            item = ItemRepository.create_item(
                item_type=item_data["type"],
                title=item_data["title"],
                raw_content=item_data["content"],
                status="pending",
                custom_id=item_uuid,
            )
            await process_ingest_background(
                item_id=item["id"],
                item_type=item_data["type"],
                content=item_data["content"],
                title=item_data["title"],
            )

    print("Seed check completed!")


if __name__ == "__main__":
    asyncio.run(seed_data())
