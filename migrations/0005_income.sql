-- Income entries table.
-- Income is manually entered (not synced from the spreadsheet).
--
-- source:           employer or income source name
-- type:             'income' | 'interest' | 'other'
-- amount:           positive dollar amount
-- date:             YYYY-MM-DD
-- is_recurring:     1 = recurring, 0 = one-time
-- recurrence_type:  'daily' | 'weekly' | 'monthly' | 'custom'
-- recurrence_custom free-text for 'custom' recurrence

CREATE TABLE IF NOT EXISTS income_entries (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  spreadsheet_id   TEXT    NOT NULL,
  source           TEXT    NOT NULL,
  type             TEXT    NOT NULL DEFAULT 'income',
  amount           REAL    NOT NULL,
  date             TEXT    NOT NULL,
  is_recurring     INTEGER NOT NULL DEFAULT 0,
  recurrence_type  TEXT,
  recurrence_custom TEXT,
  inserted_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_income_spreadsheet ON income_entries(spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_income_date        ON income_entries(date);
