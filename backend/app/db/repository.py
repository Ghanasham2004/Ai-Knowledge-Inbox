import uuid
import datetime
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from app.db.database import get_db
from app.core.logger import logger


class ItemRepository:
    @staticmethod
    def now_iso() -> str:
        return datetime.datetime.now(datetime.timezone.utc).isoformat()

    @classmethod
    def create_item(
        cls,
        item_type: str,
        title: str,
        raw_content: str,
        cleaned_content: str = "",
        source_url: Optional[str] = None,
        status: str = "pending",
        custom_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        item_id = custom_id or str(uuid.uuid4())
        now = cls.now_iso()
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO items (id, type, title, source_url, raw_content, cleaned_content, chunk_count, status, error_message, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL, ?, ?)
                """,
                (item_id, item_type, title, source_url, raw_content, cleaned_content, status, now, now),
            )
        return cls.get_item(item_id)

    @classmethod
    def get_item(cls, item_id: str) -> Optional[Dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    @classmethod
    def get_items(cls, limit: int = 50, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
        with get_db() as conn:
            total = conn.execute("SELECT COUNT(*) FROM items").fetchone()[0]
            cursor = conn.execute(
                "SELECT * FROM items ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            )
            items = [dict(row) for row in cursor.fetchall()]
            return items, total

    @classmethod
    def update_item_status(
        cls,
        item_id: str,
        status: str,
        chunk_count: Optional[int] = None,
        title: Optional[str] = None,
        cleaned_content: Optional[str] = None,
        error_message: Optional[str] = None,
    ):
        now = cls.now_iso()
        fields = ["status = ?", "updated_at = ?"]
        params = [status, now]

        if chunk_count is not None:
            fields.append("chunk_count = ?")
            params.append(chunk_count)
        if title is not None:
            fields.append("title = ?")
            params.append(title)
        if cleaned_content is not None:
            fields.append("cleaned_content = ?")
            params.append(cleaned_content)
        if error_message is not None:
            fields.append("error_message = ?")
            params.append(error_message if error_message.strip() else None)
        elif status == "ready":
            fields.append("error_message = NULL")

        params.append(item_id)
        sql = f"UPDATE items SET {', '.join(fields)} WHERE id = ?"
        with get_db() as conn:
            conn.execute(sql, tuple(params))

    @classmethod
    def delete_item(cls, item_id: str) -> bool:
        with get_db() as conn:
            cursor = conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
            return cursor.rowcount > 0

    @classmethod
    def save_chunks(cls, chunks: List[Dict[str, Any]]):
        now = cls.now_iso()
        records = []
        for c in chunks:
            chunk_id = str(uuid.uuid4())
            # Serialize embedding as float32 binary buffer
            emb_bytes = np.array(c["embedding"], dtype=np.float32).tobytes()
            records.append((
                chunk_id,
                c["item_id"],
                c["chunk_index"],
                c["content"],
                emb_bytes,
                len(c["content"]),
                now,
            ))

        with get_db() as conn:
            conn.executemany(
                """
                INSERT INTO chunks (id, item_id, chunk_index, content, embedding, char_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                records,
            )

    @classmethod
    def search_top_k_chunks(cls, query_vector: List[float], top_k: int = 4) -> List[Dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.execute(
                """
                SELECT 
                    c.id as chunk_id,
                    c.item_id,
                    c.chunk_index,
                    c.content as chunk_text,
                    c.embedding,
                    i.title,
                    i.type as source_type,
                    i.source_url
                FROM chunks c
                JOIN items i ON c.item_id = i.id
                WHERE i.status = 'ready'
                """
            )
            rows = cursor.fetchall()

        if not rows:
            return []

        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            return []

        scored_results = []
        for row in rows:
            chunk_vec = np.frombuffer(row["embedding"], dtype=np.float32)
            if chunk_vec.shape != q_vec.shape:
                continue

            c_norm = np.linalg.norm(chunk_vec)
            if c_norm > 0:
                # Cosine similarity: (A · B) / (||A|| * ||B||)
                sim = float(np.dot(q_vec, chunk_vec) / (q_norm * c_norm))
            else:
                sim = 0.0

            scored_results.append({
                "chunk_id": row["chunk_id"],
                "item_id": row["item_id"],
                "chunk_index": row["chunk_index"],
                "chunk_text": row["chunk_text"],
                "title": row["title"],
                "source_type": row["source_type"],
                "source_url": row["source_url"],
                "similarity_score": round(sim, 4),
            })

        # Sort descending by similarity score
        scored_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_results[:top_k]
