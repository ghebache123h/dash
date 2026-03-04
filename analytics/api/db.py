import os
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import psycopg
    from psycopg.rows import dict_row
    from psycopg.types.json import Json
except ImportError:  # pragma: no cover - sqlite-only local mode
    psycopg = None
    dict_row = None
    Json = None


def get_database_url() -> str:
    return os.getenv(
        "DATABASE_URL",
        "sqlite:///./analytics/local_analytics.db",
    )


def _is_sqlite_url(database_url: str) -> bool:
    return database_url.startswith("sqlite:///")


def _sqlite_path_from_url(database_url: str) -> str:
    path = database_url.removeprefix("sqlite:///")
    if not path:
        raise ValueError("Invalid sqlite DATABASE_URL. Expected format sqlite:///path/to/file.db")
    return path


def _ensure_sqlite_parent_dir(db_path: str) -> None:
    path = Path(db_path)
    parent = path.parent
    if parent and str(parent) not in (".", ""):
        parent.mkdir(parents=True, exist_ok=True)


def _get_postgres_connection() -> Any:
    if psycopg is None:
        raise RuntimeError("psycopg is not installed. Install postgres dependencies or use sqlite DATABASE_URL.")
    return psycopg.connect(get_database_url(), row_factory=dict_row)


def _get_sqlite_connection() -> sqlite3.Connection:
    database_url = get_database_url()
    db_path = _sqlite_path_from_url(database_url)
    _ensure_sqlite_parent_dir(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def apply_migrations(migrations_dir: str) -> None:
    database_url = get_database_url()
    if _is_sqlite_url(database_url):
        _apply_sqlite_schema()
        return

    sql_dir = Path(migrations_dir)
    sql_files = sorted(sql_dir.glob("*.sql"))

    with _get_postgres_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                  version TEXT PRIMARY KEY,
                  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        conn.commit()

        for file_path in sql_files:
            version = file_path.name
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM schema_migrations WHERE version = %s",
                    (version,),
                )
                already_applied = cur.fetchone() is not None

            if already_applied:
                continue

            sql_text = file_path.read_text(encoding="utf-8-sig").lstrip("\ufeff")
            
            with conn.cursor() as cur:
                # psycopg 3 requires executing statements one by one if they contain certain DDL
                for statement in sql_text.split(";"):
                    stmt = statement.strip()
                    if stmt:
                        cur.execute(stmt)
                
                cur.execute(
                    "INSERT INTO schema_migrations (version) VALUES (%s)",
                    (version,),
                )
            conn.commit()


def insert_event(event_data: dict[str, Any]) -> bool:
    metadata = event_data.get("metadata") or {}
    database_url = get_database_url()
    if _is_sqlite_url(database_url):
        with _get_sqlite_connection() as conn:
            event_time = event_data.get("event_time")
            if isinstance(event_time, datetime):
                if event_time.tzinfo is None:
                    event_time = event_time.replace(tzinfo=timezone.utc)
                event_time = event_time.astimezone(timezone.utc).isoformat()
            elif event_time is None:
                event_time = datetime.now(timezone.utc).isoformat()
            else:
                event_time = str(event_time)

            cur = conn.cursor()
            cur.execute(
                """
                INSERT OR IGNORE INTO analytics_events (
                  event_key,
                  event_type,
                  event_time,
                  conversation_id,
                  customer_id,
                  channel,
                  direction,
                  category,
                  intent,
                  otp_status,
                  escalation_reason,
                  token_input,
                  token_output,
                  metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_data.get("event_key"),
                    event_data.get("event_type"),
                    event_time,
                    event_data.get("conversation_id"),
                    event_data.get("customer_id"),
                    event_data.get("channel"),
                    event_data.get("direction"),
                    event_data.get("category"),
                    event_data.get("intent"),
                    event_data.get("otp_status"),
                    event_data.get("escalation_reason"),
                    int(event_data.get("token_input") or 0),
                    int(event_data.get("token_output") or 0),
                    json.dumps(metadata, ensure_ascii=False),
                ),
            )
            inserted = cur.rowcount > 0
            conn.commit()
            return inserted

    with _get_postgres_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO analytics_events (
              event_key,
              event_type,
              event_time,
              conversation_id,
              customer_id,
              channel,
              direction,
              category,
              intent,
              otp_status,
              escalation_reason,
              token_input,
              token_output,
              metadata
            )
            VALUES (
              %(event_key)s,
              %(event_type)s,
              %(event_time)s,
              %(conversation_id)s,
              %(customer_id)s,
              %(channel)s,
              %(direction)s,
              %(category)s,
              %(intent)s,
              %(otp_status)s,
              %(escalation_reason)s,
              %(token_input)s,
              %(token_output)s,
              %(metadata)s
            )
            ON CONFLICT (event_key) DO NOTHING
            RETURNING id
            """,
            {
                **event_data,
                "metadata": Json(metadata),
            },
        )
        inserted = cur.fetchone() is not None
        conn.commit()
        return inserted


def get_pricing() -> dict[str, float]:
    database_url = get_database_url()
    if _is_sqlite_url(database_url):
        with _get_sqlite_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT input_price_per_million, output_price_per_million
                FROM pricing_settings
                WHERE id = 1
                """
            )
            row = cur.fetchone()
            if not row:
                return {"input_price_per_million": 0.0, "output_price_per_million": 0.0}
            return {
                "input_price_per_million": float(row["input_price_per_million"]),
                "output_price_per_million": float(row["output_price_per_million"]),
            }

    with _get_postgres_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT input_price_per_million, output_price_per_million
            FROM pricing_settings
            WHERE id = 1
            """
        )
        row = cur.fetchone()
        if not row:
            return {"input_price_per_million": 0.0, "output_price_per_million": 0.0}
        return {
            "input_price_per_million": float(row["input_price_per_million"]),
            "output_price_per_million": float(row["output_price_per_million"]),
        }


def update_pricing(input_price_per_million: float, output_price_per_million: float) -> None:
    database_url = get_database_url()
    if _is_sqlite_url(database_url):
        with _get_sqlite_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO pricing_settings (
                  id,
                  input_price_per_million,
                  output_price_per_million,
                  updated_at
                ) VALUES (1, ?, ?, datetime('now'))
                ON CONFLICT(id) DO UPDATE SET
                  input_price_per_million = excluded.input_price_per_million,
                  output_price_per_million = excluded.output_price_per_million,
                  updated_at = datetime('now')
                """,
                (input_price_per_million, output_price_per_million),
            )
            conn.commit()
        return

    with _get_postgres_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO pricing_settings (
              id,
              input_price_per_million,
              output_price_per_million,
              updated_at
            )
            VALUES (1, %s, %s, NOW())
            ON CONFLICT (id) DO UPDATE
            SET
              input_price_per_million = EXCLUDED.input_price_per_million,
              output_price_per_million = EXCLUDED.output_price_per_million,
              updated_at = NOW()
            """,
            (input_price_per_million, output_price_per_million),
        )
        conn.commit()


def _apply_sqlite_schema() -> None:
    with _get_sqlite_connection() as conn:
        cur = conn.cursor()
        cur.executescript(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
              version TEXT PRIMARY KEY,
              applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS analytics_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              event_key TEXT NOT NULL UNIQUE,
              event_type TEXT NOT NULL,
              event_time TEXT NOT NULL DEFAULT (datetime('now')),
              conversation_id TEXT,
              customer_id TEXT,
              channel TEXT NOT NULL DEFAULT 'whatsapp',
              direction TEXT,
              category TEXT,
              intent TEXT,
              otp_status TEXT,
              escalation_reason TEXT,
              token_input INTEGER NOT NULL DEFAULT 0,
              token_output INTEGER NOT NULL DEFAULT 0,
              metadata TEXT NOT NULL DEFAULT '{}',
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_analytics_events_time ON analytics_events (event_time);
            CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type);
            CREATE INDEX IF NOT EXISTS idx_analytics_events_conversation ON analytics_events (conversation_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_events_customer ON analytics_events (customer_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events (category);

            CREATE TABLE IF NOT EXISTS pricing_settings (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              input_price_per_million REAL NOT NULL DEFAULT 0,
              output_price_per_million REAL NOT NULL DEFAULT 0,
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            INSERT OR IGNORE INTO pricing_settings (id, input_price_per_million, output_price_per_million)
            VALUES (1, 0, 0);
            """
        )
        cur.execute(
            """
            INSERT OR IGNORE INTO schema_migrations (version)
            VALUES (?)
            """,
            ("001_init_sqlite",),
        )
        conn.commit()
