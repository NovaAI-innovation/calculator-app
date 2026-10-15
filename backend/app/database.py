"""SQLite access layer for calculation history.

Importing this module does NOT touch the filesystem; the table is created
in the FastAPI lifespan on startup. One connection per request, parameterized
SQL only.
"""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, List, Optional, TypedDict

DEFAULT_DB_PATH = "/opt/data/projects/calculator-app/backend/data/calculator.db"


def default_db_path() -> str:
    """Resolve the production DB path from env or fallback default."""
    return os.environ.get("CALC_DB_PATH", DEFAULT_DB_PATH)


class HistoryRecord(TypedDict):
    id: int
    expression: str
    result: str
    created_at: str


def init_db(db_path: str) -> None:
    """Create the history table if missing. Idempotent."""
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expression TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_history_created_at "
            "ON history(created_at)"
        )
        conn.commit()


@contextmanager
def connect(db_path: str) -> Iterator[sqlite3.Connection]:
    """Context-managed sqlite3 connection (one per request)."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def now_iso() -> str:
    """UTC timestamp in ISO 8601 with microseconds and offset."""
    return datetime.now(timezone.utc).isoformat()


def insert_history(
    db_path: str, expression: str, result: str, created_at: Optional[str] = None
) -> HistoryRecord:
    ts = created_at if created_at is not None else now_iso()
    with connect(db_path) as conn:
        cur = conn.execute(
            "INSERT INTO history (expression, result, created_at) "
            "VALUES (?, ?, ?)",
            (expression, result, ts),
        )
        conn.commit()
        new_id = cur.lastrowid
        row = conn.execute(
            "SELECT id, expression, result, created_at FROM history WHERE id = ?",
            (new_id,),
        ).fetchone()
        return {
            "id": int(row["id"]),
            "expression": row["expression"],
            "result": row["result"],
            "created_at": row["created_at"],
        }


def list_history(db_path: str, limit: int, offset: int) -> tuple[List[HistoryRecord], int]:
    with connect(db_path) as conn:
        total = int(conn.execute("SELECT COUNT(*) FROM history").fetchone()[0])
        rows = conn.execute(
            "SELECT id, expression, result, created_at FROM history "
            "ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        items: List[HistoryRecord] = [
            {
                "id": int(r["id"]),
                "expression": r["expression"],
                "result": r["result"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]
        return items, total


def delete_history_item(db_path: str, item_id: int) -> bool:
    with connect(db_path) as conn:
        cur = conn.execute("DELETE FROM history WHERE id = ?", (item_id,))
        conn.commit()
        return cur.rowcount > 0


def clear_history(db_path: str) -> int:
    with connect(db_path) as conn:
        cur = conn.execute("DELETE FROM history")
        conn.commit()
        return cur.rowcount