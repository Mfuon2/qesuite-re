-- SQLite cannot alter a CHECK constraint in place, so preserve all products
-- while extending the Sold by units with kg for pre-order menu items.
CREATE TABLE products_next (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_profile(id),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  unit TEXT NOT NULL CHECK (unit IN ('piece', 'plate', 'cup', 'portion', 'item', 'kg', 'bottle', 'can', 'glass', 'litre', 'ml', 'packet', 'box', 'dozen', 'tray', 'bowl', 'skewer')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  category TEXT NOT NULL DEFAULT 'Menu'
);

INSERT INTO products_next (id, business_id, name, price_minor, unit, active, category)
  SELECT id, business_id, name, price_minor, unit, active, category FROM products;

DROP TABLE products;
ALTER TABLE products_next RENAME TO products;

CREATE INDEX IF NOT EXISTS idx_products_business ON products (business_id, active);
CREATE INDEX IF NOT EXISTS idx_products_business_category ON products (business_id, category, active, name);
