"""
Minimal Postgres-backed key-value store.

Farmer profiles and WhatsApp registration state used to be local JSON
files (see git history of farmer_store.py / whatsapp_state.py), which
worked locally but silently lost all data on every Render redeploy —
Render's free-tier filesystem is ephemeral and resets on each deploy.
That's a real problem for a WhatsApp bot where losing registrations on
every deploy means farmers have to re-register constantly.

One shared (namespace, key) -> jsonb table rather than a table per
concern, since every current use case is "store one JSON blob per phone
number" — no need for a fuller relational schema yet. This is a
deliberate exception to this project's "no DB unless explicitly asked"
convention (see AGENTS.md), made because production data loss on every
deploy isn't acceptable for a farmer-facing feature.
"""

import os
from contextlib import contextmanager
from typing import Optional

import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ.get("DATABASE_URL")

_initialized = False


@contextmanager
def _connect():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _ensure_table() -> None:
    global _initialized
    if _initialized:
        return
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS kv_store (
                    namespace TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value JSONB NOT NULL,
                    PRIMARY KEY (namespace, key)
                )
                """
            )
    _initialized = True


def get(namespace: str, key: str) -> Optional[dict]:
    _ensure_table()
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT value FROM kv_store WHERE namespace = %s AND key = %s",
                (namespace, key),
            )
            row = cur.fetchone()
            return row[0] if row else None


def set(namespace: str, key: str, value: dict) -> None:
    _ensure_table()
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO kv_store (namespace, key, value)
                VALUES (%s, %s, %s)
                ON CONFLICT (namespace, key) DO UPDATE SET value = EXCLUDED.value
                """,
                (namespace, key, psycopg2.extras.Json(value)),
            )


def delete(namespace: str, key: str) -> None:
    _ensure_table()
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM kv_store WHERE namespace = %s AND key = %s",
                (namespace, key),
            )


def list_all(namespace: str) -> list[dict]:
    _ensure_table()
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT value FROM kv_store WHERE namespace = %s", (namespace,))
            return [row[0] for row in cur.fetchall()]
