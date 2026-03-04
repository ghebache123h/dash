import hashlib
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    from analytics.api.db import apply_migrations, insert_event
except ImportError:  # pragma: no cover - script execution fallback
    repo_root = Path(__file__).resolve().parents[2]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    from analytics.api.db import apply_migrations, insert_event


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./analytics/local_analytics.db")
MIGRATIONS_DIR = os.getenv("MIGRATIONS_DIR", "analytics/db/migrations")


def event_key(*parts: str) -> str:
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def main() -> None:
    os.environ["DATABASE_URL"] = DATABASE_URL
    os.environ["MIGRATIONS_DIR"] = MIGRATIONS_DIR

    apply_migrations(MIGRATIONS_DIR)

    now = datetime.now(timezone.utc)
    events = [
        {
            "event_key": event_key("inbound_message", "2001", "m-1"),
            "event_type": "inbound_message",
            "event_time": now - timedelta(minutes=45),
            "conversation_id": "2001",
            "customer_id": "+966500000001",
            "channel": "whatsapp",
            "direction": "inbound",
            "category": "disney",
            "intent": "otp_request",
            "otp_status": None,
            "escalation_reason": None,
            "token_input": 0,
            "token_output": 0,
            "metadata": {"source_event_id": "m-1"},
        },
        {
            "event_key": event_key("conversation_created", "2001", "c-2001"),
            "event_type": "conversation_created",
            "event_time": now - timedelta(minutes=45),
            "conversation_id": "2001",
            "customer_id": "+966500000001",
            "channel": "whatsapp",
            "direction": "system",
            "category": "disney",
            "intent": "otp_request",
            "otp_status": None,
            "escalation_reason": None,
            "token_input": 0,
            "token_output": 0,
            "metadata": {"source_event_id": "c-2001"},
        },
        {
            "event_key": event_key("otp_request", "2001", "req-2001"),
            "event_type": "otp_request",
            "event_time": now - timedelta(minutes=42),
            "conversation_id": "2001",
            "customer_id": "+966500000001",
            "channel": "whatsapp",
            "direction": "system",
            "category": "disney",
            "intent": "otp_request",
            "otp_status": "requested",
            "escalation_reason": None,
            "token_input": 0,
            "token_output": 0,
            "metadata": {"source_event_id": "req-2001"},
        },
        {
            "event_key": event_key("ai_usage", "2001", "ai-1"),
            "event_type": "ai_usage",
            "event_time": now - timedelta(minutes=41),
            "conversation_id": "2001",
            "customer_id": "+966500000001",
            "channel": "whatsapp",
            "direction": "system",
            "category": "disney",
            "intent": "otp_request",
            "otp_status": None,
            "escalation_reason": None,
            "token_input": 800,
            "token_output": 240,
            "metadata": {"execution_id": "ai-1"},
        },
        {
            "event_key": event_key("otp_outcome", "2001", "ok-1"),
            "event_type": "otp_outcome",
            "event_time": now - timedelta(minutes=39),
            "conversation_id": "2001",
            "customer_id": "+966500000001",
            "channel": "whatsapp",
            "direction": "inbound",
            "category": "disney",
            "intent": "otp_feedback",
            "otp_status": "success",
            "escalation_reason": None,
            "token_input": 0,
            "token_output": 0,
            "metadata": {"source_event_id": "ok-1"},
        },
        {
            "event_key": event_key("support_escalation", "2002", "esc-1"),
            "event_type": "support_escalation",
            "event_time": now - timedelta(minutes=20),
            "conversation_id": "2002",
            "customer_id": "+966500000002",
            "channel": "whatsapp",
            "direction": "system",
            "category": "fasel",
            "intent": "support_handoff",
            "otp_status": None,
            "escalation_reason": "account_banned",
            "token_input": 0,
            "token_output": 0,
            "metadata": {
                "conversation_url": "https://app.chatwoot.com/app/accounts/152788/inbox-view/conversation/2002"
            },
        },
    ]

    inserted = 0
    for event in events:
        if insert_event(event):
            inserted += 1

    print(json.dumps({"seeded_events": len(events), "inserted_new": inserted}))


if __name__ == "__main__":
    main()
