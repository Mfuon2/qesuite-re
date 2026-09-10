CREATE TABLE IF NOT EXISTS business_profile (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  tagline TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_profile(id),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  unit TEXT NOT NULL CHECK (unit IN ('piece', 'plate', 'cup', 'portion', 'item')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id, active);
