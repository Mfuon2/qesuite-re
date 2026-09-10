CREATE TABLE IF NOT EXISTS business_events (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  type TEXT NOT NULL,
  item_id TEXT,
  item_name TEXT,
  quantity REAL,
  amount REAL,
  note TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_events_business_occurred
  ON business_events (business_id, occurred_at DESC);
