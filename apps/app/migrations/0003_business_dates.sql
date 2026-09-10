-- A record's business day is always Nairobi time, never the D1 host's clock.
ALTER TABLE business_events ADD COLUMN business_date TEXT;

-- Backfill legacy UTC timestamps. Nairobi is UTC+3 and has no daylight-saving changes.
UPDATE business_events
   SET business_date = strftime('%Y-%m-%d', occurred_at, '+3 hours')
 WHERE business_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_events_business_date
  ON business_events (business_id, business_date, occurred_at DESC);

-- The Worker computes this value with Intl/Africa/Nairobi before every insert.
-- The trigger prevents records without a durable, queryable business date.
DROP TRIGGER IF EXISTS require_business_date_before_insert;
CREATE TRIGGER require_business_date_before_insert
BEFORE INSERT ON business_events
WHEN NEW.business_date IS NULL
  OR NEW.business_date NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  OR NEW.business_date != strftime('%Y-%m-%d', NEW.occurred_at, '+3 hours')
BEGIN
  SELECT RAISE(ABORT, 'business_date must match Africa/Nairobi');
END;
