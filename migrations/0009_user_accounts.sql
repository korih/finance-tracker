-- User accounts: links Google identity to an internal spreadsheet ID and a rotatable API key
CREATE TABLE IF NOT EXISTS user_accounts (
  user_id        TEXT PRIMARY KEY,    -- Google OAuth sub (permanent)
  api_id         TEXT NOT NULL UNIQUE, -- Rotatable UUID used to authenticate ingest requests
  spreadsheet_id TEXT NOT NULL UNIQUE, -- Internal account ID (fixed; keys all data tables)
  inserted_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add user_id for ownership tracking on all data tables
ALTER TABLE transactions    ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE income_entries  ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE categories      ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE recurring_rules ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE savings_goals   ADD COLUMN user_id TEXT NOT NULL DEFAULT '';

-- Rename source 'sheet' → 'api' to reflect the new ingestion method
UPDATE transactions SET source = 'api' WHERE source = 'sheet';
