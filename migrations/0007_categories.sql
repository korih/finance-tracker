-- Categories: user-defined spending buckets with regex pattern lists for auto-classification
CREATE TABLE IF NOT EXISTS categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  spreadsheet_id TEXT NOT NULL,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#a78bfa',
  -- JSON array of regex strings, e.g. ["whole foods","safeway","trader joe"]
  patterns      TEXT NOT NULL DEFAULT '[]',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  inserted_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(spreadsheet_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_spreadsheet ON categories(spreadsheet_id);

-- Denormalised category on transactions + income for fast reads (no join needed)
ALTER TABLE transactions    ADD COLUMN category TEXT;
ALTER TABLE income_entries  ADD COLUMN category TEXT;
