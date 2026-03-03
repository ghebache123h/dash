import hashlib
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    from .db import apply_migrations, get_pricing, insert_event, update_pricing
except ImportError:  # pragma: no cover - runtime fallback when executed as script
    from db import apply_migrations, get_pricing, insert_event, update_pricing


class EventIn(BaseModel):
    event_key: str | None = None
    event_type: str
    event_time: datetime | None = None
    conversation_id: str | None = None
    customer_id: str | None = None
    channel: str = "whatsapp"
    direction: str | None = None
    category: str | None = None
    intent: str | None = None
    otp_status: str | None = None
    escalation_reason: str | None = None
    token_input: int = 0
    token_output: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)


class PricingIn(BaseModel):
    input_price_per_million: float = Field(ge=0)
    output_price_per_million: float = Field(ge=0)


app = FastAPI(title="WhatsApp Analytics Ingest API", version="1.0.0")


def _build_event_key(event: dict[str, Any]) -> str:
    metadata = event.get("metadata") or {}
    source_event_id = (
        metadata.get("source_event_id")
        or metadata.get("message_id")
        or metadata.get("execution_id")
        or ""
    )
    raw_key = "|".join(
        [
            str(event.get("event_type") or ""),
            str(event.get("conversation_id") or ""),
            str(event.get("customer_id") or ""),
            str(event.get("channel") or ""),
            str(event.get("direction") or ""),
            str(event.get("otp_status") or ""),
            str(source_event_id),
            str(event.get("event_time") or ""),
        ]
    )
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


@app.on_event("startup")
def startup() -> None:
    migrations_dir = os.getenv("MIGRATIONS_DIR", "/app/db/migrations")
    apply_migrations(migrations_dir)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/events")
def create_event(payload: EventIn) -> dict[str, Any]:
    event_data = payload.model_dump()
    if not event_data["event_time"]:
        event_data["event_time"] = datetime.now(timezone.utc)
    event_data["event_time"] = event_data["event_time"].astimezone(timezone.utc)
    if not event_data["event_key"]:
        event_data["event_key"] = _build_event_key(event_data)

    try:
        inserted = insert_event(event_data)
    except Exception as exc:  # pragma: no cover - runtime protection
        raise HTTPException(status_code=500, detail=f"failed_to_insert_event: {exc}") from exc

    return {
        "inserted": inserted,
        "event_key": event_data["event_key"],
    }


@app.post("/events/bulk")
def create_events_bulk(payload: list[EventIn]) -> dict[str, Any]:
    inserted_count = 0
    for item in payload:
        event_data = item.model_dump()
        if not event_data["event_time"]:
            event_data["event_time"] = datetime.now(timezone.utc)
        event_data["event_time"] = event_data["event_time"].astimezone(timezone.utc)
        if not event_data["event_key"]:
            event_data["event_key"] = _build_event_key(event_data)
        if insert_event(event_data):
            inserted_count += 1

    return {"received": len(payload), "inserted": inserted_count}


@app.get("/pricing")
def pricing_get() -> dict[str, float]:
    return get_pricing()


@app.put("/pricing")
def pricing_update(payload: PricingIn) -> dict[str, str]:
    update_pricing(payload.input_price_per_million, payload.output_price_per_million)
    return {"status": "updated"}
