import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover - sqlite local mode
    psycopg = None
    dict_row = None


st.set_page_config(page_title="WhatsApp AI Analytics", layout="wide")


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./analytics/local_analytics.db")


def is_sqlite() -> bool:
    return get_database_url().startswith("sqlite:///")


def sqlite_path() -> str:
    return get_database_url().removeprefix("sqlite:///")


def ensure_sqlite_schema() -> None:
    if not is_sqlite():
        return
    path = sqlite_path()
    parent = Path(path).parent
    if parent and str(parent) not in (".", ""):
        parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.executescript(
            """
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
        conn.commit()


def run_query(sql: str, params: Any | None = None) -> list[dict[str, Any]]:
    if is_sqlite():
        with sqlite3.connect(sqlite_path()) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute(sql, params or {})
            rows = cur.fetchall()
            return [dict(row) for row in rows]

    if psycopg is None:
        raise RuntimeError("psycopg is required for PostgreSQL mode.")
    with psycopg.connect(get_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or {})
            return cur.fetchall()


def run_execute(sql: str, params: Any | None = None) -> None:
    if is_sqlite():
        with sqlite3.connect(sqlite_path()) as conn:
            cur = conn.cursor()
            cur.execute(sql, params or {})
            conn.commit()
        return

    if psycopg is None:
        raise RuntimeError("psycopg is required for PostgreSQL mode.")
    with psycopg.connect(get_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or {})
        conn.commit()


def to_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def parse_metadata(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if value is None:
        return {}
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def load_distinct_values(column: str) -> list[str]:
    if is_sqlite():
        rows = run_query(
            f"SELECT DISTINCT {column} AS value FROM analytics_events WHERE {column} IS NOT NULL AND {column} != '' ORDER BY 1"
        )
    else:
        rows = run_query(
            f"SELECT DISTINCT {column} AS value FROM analytics_events WHERE {column} IS NOT NULL AND {column} <> '' ORDER BY 1"
        )
    return [row["value"] for row in rows if row.get("value")]


def load_events_range(start_utc: datetime, end_utc: datetime) -> pd.DataFrame:
    if is_sqlite():
        rows = run_query(
            """
            SELECT
              event_time,
              event_type,
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
              metadata,
              event_key
            FROM analytics_events
            WHERE event_time >= :start_dt
              AND event_time <= :end_dt
            ORDER BY event_time DESC
            """,
            {"start_dt": start_utc.isoformat(), "end_dt": end_utc.isoformat()},
        )
    else:
        rows = run_query(
            """
            SELECT
              event_time,
              event_type,
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
              metadata,
              event_key
            FROM analytics_events
            WHERE event_time >= %(start_dt)s
              AND event_time <= %(end_dt)s
            ORDER BY event_time DESC
            """,
            {"start_dt": start_utc, "end_dt": end_utc},
        )

    if not rows:
        return pd.DataFrame(
            columns=[
                "event_time",
                "event_type",
                "conversation_id",
                "customer_id",
                "channel",
                "direction",
                "category",
                "intent",
                "otp_status",
                "escalation_reason",
                "token_input",
                "token_output",
                "metadata",
                "event_key",
            ]
        )

    df = pd.DataFrame(rows)
    df["event_time"] = pd.to_datetime(df["event_time"], utc=True, errors="coerce")
    df["token_input"] = pd.to_numeric(df["token_input"], errors="coerce").fillna(0).astype(int)
    df["token_output"] = pd.to_numeric(df["token_output"], errors="coerce").fillna(0).astype(int)
    return df


def load_inbound_all_time() -> pd.DataFrame:
    if is_sqlite():
        rows = run_query(
            """
            SELECT conversation_id, customer_id, channel, category, event_time
            FROM analytics_events
            WHERE event_type = 'inbound_message'
              AND conversation_id IS NOT NULL
            """
        )
    else:
        rows = run_query(
            """
            SELECT conversation_id, customer_id, channel, category, event_time
            FROM analytics_events
            WHERE event_type = 'inbound_message'
              AND conversation_id IS NOT NULL
            """
        )

    if not rows:
        return pd.DataFrame(columns=["conversation_id", "customer_id", "channel", "category", "event_time"])
    df = pd.DataFrame(rows)
    df["event_time"] = pd.to_datetime(df["event_time"], utc=True, errors="coerce")
    return df


def get_pricing_row() -> dict[str, float]:
    rows = run_query(
        """
        SELECT input_price_per_million, output_price_per_million
        FROM pricing_settings
        WHERE id = 1
        """
    )
    if not rows:
        return {"input_price_per_million": 0.0, "output_price_per_million": 0.0}
    return {
        "input_price_per_million": float(rows[0]["input_price_per_million"] or 0),
        "output_price_per_million": float(rows[0]["output_price_per_million"] or 0),
    }


def save_pricing(input_price: float, output_price: float) -> None:
    if is_sqlite():
        run_execute(
            """
            INSERT INTO pricing_settings (id, input_price_per_million, output_price_per_million, updated_at)
            VALUES (1, :input_price, :output_price, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              input_price_per_million = excluded.input_price_per_million,
              output_price_per_million = excluded.output_price_per_million,
              updated_at = datetime('now')
            """,
            {"input_price": input_price, "output_price": output_price},
        )
        return

    run_execute(
        """
        INSERT INTO pricing_settings (id, input_price_per_million, output_price_per_million, updated_at)
        VALUES (1, %(input_price)s, %(output_price)s, NOW())
        ON CONFLICT (id) DO UPDATE
        SET
          input_price_per_million = EXCLUDED.input_price_per_million,
          output_price_per_million = EXCLUDED.output_price_per_million,
          updated_at = NOW()
        """,
        {"input_price": input_price, "output_price": output_price},
    )


ensure_sqlite_schema()

st.title("WhatsApp AI Support Analytics Dashboard")
st.caption("Operational KPIs, OTP performance, token usage, cost tracking, and escalation monitoring.")


default_end = datetime.now()
default_start = default_end - timedelta(days=7)

st.sidebar.header("Filters")
start_dt = st.sidebar.datetime_input("Start datetime", value=default_start, format="YYYY-MM-DD HH:mm")
end_dt = st.sidebar.datetime_input("End datetime", value=default_end, format="YYYY-MM-DD HH:mm")
start_utc = to_utc(start_dt)
end_utc = to_utc(end_dt)

if end_utc <= start_utc:
    st.error("End datetime must be after start datetime.")
    st.stop()

channel_options = load_distinct_values("channel")
category_options = load_distinct_values("category")

selected_channels = st.sidebar.multiselect("Channel", options=channel_options, default=channel_options)
selected_categories = st.sidebar.multiselect("Category", options=category_options, default=category_options)

pricing_row = get_pricing_row()

st.sidebar.header("Token Pricing")
input_price = st.sidebar.number_input(
    "Input price per 1M tokens",
    min_value=0.0,
    value=float(pricing_row["input_price_per_million"]),
    step=0.01,
    format="%.6f",
)
output_price = st.sidebar.number_input(
    "Output price per 1M tokens",
    min_value=0.0,
    value=float(pricing_row["output_price_per_million"]),
    step=0.01,
    format="%.6f",
)

if st.sidebar.button("Save pricing"):
    save_pricing(input_price, output_price)
    st.sidebar.success("Pricing updated.")

events_df = load_events_range(start_utc, end_utc)
if selected_channels:
    events_df = events_df[events_df["channel"].isin(selected_channels)]
if selected_categories:
    events_df = events_df[events_df["category"].isin(selected_categories)]

if not events_df.empty:
    events_df = events_df.sort_values("event_time", ascending=False)

all_inbound_df = load_inbound_all_time()
if selected_channels and not all_inbound_df.empty:
    all_inbound_df = all_inbound_df[all_inbound_df["channel"].isin(selected_channels)]
if selected_categories and not all_inbound_df.empty:
    all_inbound_df = all_inbound_df[all_inbound_df["category"].isin(selected_categories)]

if not all_inbound_df.empty:
    first_inbound = all_inbound_df.groupby("conversation_id", dropna=True)["event_time"].min()
    new_conversations = int(((first_inbound >= pd.Timestamp(start_utc)) & (first_inbound <= pd.Timestamp(end_utc))).sum())
else:
    new_conversations = 0

total_messages = int(events_df["event_type"].isin(["inbound_message", "outbound_message"]).sum()) if not events_df.empty else 0
if not events_df.empty:
    disney_customers = int(
        events_df[
            (events_df["category"] == "disney") & (events_df["event_type"] == "inbound_message")
        ]
        .assign(customer_key=lambda x: x["customer_id"].fillna(x["conversation_id"]))
        ["customer_key"]
        .nunique()
    )
else:
    disney_customers = 0

disney_code_requests = int((events_df["event_type"] == "otp_request").sum()) if not events_df.empty else 0
otp_success_count = int(((events_df["event_type"] == "otp_outcome") & (events_df["otp_status"] == "success")).sum()) if not events_df.empty else 0
otp_failed_count = int(((events_df["event_type"] == "otp_outcome") & (events_df["otp_status"] == "failed")).sum()) if not events_df.empty else 0
otp_unconfirmed_count = int(
    ((events_df["event_type"] == "otp_outcome") & (events_df["otp_status"] == "unconfirmed")).sum()
) if not events_df.empty else 0
support_escalation_count = int((events_df["event_type"] == "support_escalation").sum()) if not events_df.empty else 0

conversation_count = int(events_df["conversation_id"].dropna().nunique()) if not events_df.empty else 0
avg_messages_per_conversation = round(total_messages / conversation_count, 2) if conversation_count > 0 else 0.0

input_tokens_total = int(events_df["token_input"].sum()) if not events_df.empty else 0
output_tokens_total = int(events_df["token_output"].sum()) if not events_df.empty else 0

input_conv_count = int(events_df[events_df["token_input"] > 0]["conversation_id"].dropna().nunique()) if not events_df.empty else 0
output_conv_count = int(events_df[events_df["token_output"] > 0]["conversation_id"].dropna().nunique()) if not events_df.empty else 0
avg_input_tokens_per_conversation = round(input_tokens_total / input_conv_count, 2) if input_conv_count > 0 else 0.0
avg_output_tokens_per_conversation = round(output_tokens_total / output_conv_count, 2) if output_conv_count > 0 else 0.0

input_cost = (input_tokens_total / 1_000_000) * input_price
output_cost = (output_tokens_total / 1_000_000) * output_price
total_cost = input_cost + output_cost


row1 = st.columns(4)
row1[0].metric("Total messages", total_messages)
row1[1].metric("New conversations", new_conversations)
row1[2].metric("Disney customers", disney_customers)
row1[3].metric("Disney code requests", disney_code_requests)

row2 = st.columns(4)
row2[0].metric("OTP success", otp_success_count)
row2[1].metric("OTP failed", otp_failed_count)
row2[2].metric("OTP unconfirmed", otp_unconfirmed_count)
row2[3].metric("Escalations", support_escalation_count)

row3 = st.columns(4)
row3[0].metric("Avg messages / conversation", avg_messages_per_conversation)
row3[1].metric("Input tokens", input_tokens_total)
row3[2].metric("Output tokens", output_tokens_total)
row3[3].metric("Total token cost", f"${total_cost:,.4f}")

row4 = st.columns(4)
row4[0].metric("Avg input tokens / conversation", avg_input_tokens_per_conversation)
row4[1].metric("Avg output tokens / conversation", avg_output_tokens_per_conversation)
row4[2].metric("Input cost", f"${input_cost:,.4f}")
row4[3].metric("Output cost", f"${output_cost:,.4f}")


st.subheader("Escalated Conversations (Support Monitoring)")
if not events_df.empty:
    esc_df = events_df[events_df["event_type"] == "support_escalation"].copy()
else:
    esc_df = pd.DataFrame()

if not esc_df.empty:
    esc_df["customer_id"] = esc_df["customer_id"].fillna("unknown")
    esc_df["conversation_id"] = esc_df["conversation_id"].fillna("unknown")
    esc_df["metadata_dict"] = esc_df["metadata"].apply(parse_metadata)
    esc_df["conversation_reference"] = esc_df["metadata_dict"].apply(lambda x: x.get("conversation_url", ""))

    grouped_rows: list[dict[str, Any]] = []
    grouped = esc_df.groupby(["customer_id", "conversation_id"], dropna=False)
    for (customer_id, conversation_id), group in grouped:
        reasons = sorted({str(v) for v in group["escalation_reason"].dropna().tolist() if str(v).strip()})
        references = [ref for ref in group["conversation_reference"].tolist() if ref]
        grouped_rows.append(
            {
                "customer_id": customer_id,
                "conversation_id": conversation_id,
                "escalation_count": int(len(group)),
                "escalation_reason": ", ".join(reasons) if reasons else "unspecified",
                "first_escalation_at": group["event_time"].min(),
                "last_escalation_at": group["event_time"].max(),
                "repeated_support_requests": "Yes" if len(group) > 1 else "No",
                "conversation_reference": references[-1] if references else "",
            }
        )

    escalation_view_df = pd.DataFrame(grouped_rows).sort_values("last_escalation_at", ascending=False)
    st.dataframe(escalation_view_df, use_container_width=True)
else:
    st.info("No escalations in selected time range.")


st.subheader("Recent Events")
if not events_df.empty:
    recent_df = events_df[
        [
            "event_time",
            "event_type",
            "conversation_id",
            "customer_id",
            "category",
            "intent",
            "otp_status",
            "escalation_reason",
            "token_input",
            "token_output",
            "event_key",
        ]
    ].head(200)
    st.dataframe(recent_df, use_container_width=True)
else:
    st.info("No events available for selected filters.")
