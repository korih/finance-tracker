-- Extend transactions to support manually entered rows and soft-deletion.
--
-- Changes:
--   row_index  → nullable  (NULL for manual entries; sheet rows keep their 1-based index)
--   source     → new TEXT  'sheet' | 'manual'
--   excluded   → new INT   0 = active, 1 = soft-deleted (sheet rows only)
--
-- SQLite does not support ALTER COLUMN, so we recreate the table.

CREATE TABLE transactions_new (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp      TEXT    NOT NULL,
  merchant       TEXT    NOT NULL,
  name           TEXT    NOT NULL,
  amount         REAL    NOT NULL,
  card           TEXT    NOT NULL,
  inserted_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  spreadsheet_id TEXT    NOT NULL DEFAULT '',
  row_index      INTEGER,                          -- NULL for manual entries
  source         TEXT    NOT NULL DEFAULT 'sheet', -- 'sheet' | 'manual'
  excluded       INTEGER NOT NULL DEFAULT 0        -- 1 = hidden from calculations
);

INSERT INTO transactions_new
  SELECT id, timestamp, merchant, name, amount, card, inserted_at,
         spreadsheet_id, row_index, 'sheet', 0
  FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;

CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant  ON transactions(merchant);
CREATE INDEX IF NOT EXISTS idx_transactions_card      ON transactions(card);

-- Uniqueness only applies to sheet-sourced rows (manual rows have NULL row_index,
-- and SQLite treats each NULL as distinct so they never conflict).
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_source
  ON transactions(spreadsheet_id, row_index)
  WHERE row_index IS NOT NULL;
