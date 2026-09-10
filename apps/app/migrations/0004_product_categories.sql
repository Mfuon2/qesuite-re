ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'Menu';

CREATE INDEX IF NOT EXISTS idx_products_business_category
  ON products (business_id, category, active, name);
