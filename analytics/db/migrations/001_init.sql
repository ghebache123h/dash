CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conversation_id TEXT,
  customer_id TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  direction TEXT,
  category TEXT,
  intent TEXT,
  otp_status TEXT,
  escalation_reason TEXT,
  token_input BIGINT NOT NULL DEFAULT 0,
  token_output BIGINT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_time ON analytics_events (event_time);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_conversation ON analytics_events (conversation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_customer ON analytics_events (customer_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events (category);

CREATE TABLE IF NOT EXISTS pricing_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  input_price_per_million NUMERIC(18, 6) NOT NULL DEFAULT 0,
  output_price_per_million NUMERIC(18, 6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_single_row CHECK (id = 1)
);

INSERT INTO pricing_settings (id, input_price_per_million, output_price_per_million)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;
