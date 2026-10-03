import sqlite3
import os
from contextlib import contextmanager
from app.config import settings
from app.core.logger import logger


def get_db_path() -> str:
    # Ensure directory exists if path contains a folder
    dir_name = os.path.dirname(settings.DATABASE_PATH)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    return settings.DATABASE_PATH


@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path(), timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    logger.info(f"Initializing database at: {get_db_path()}")
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            source_url TEXT,
            raw_content TEXT NOT NULL,
            cleaned_content TEXT NOT NULL,
            chunk_count INTEGER DEFAULT 0,
            status TEXT NOT NULL,
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
        CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

        CREATE TABLE IF NOT EXISTS chunks (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding BLOB NOT NULL,
            char_count INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_chunks_item_id ON chunks(item_id);
        """)
    logger.info("Database schema initialized successfully.")
