-- Add spreadsheet source mapping to transactions.
-- spreadsheet_id: the Google Sheets file ID (from Drive API)
-- row_index: 1-based row number in the sheet, excluding the header row
-- Together they uniquely identify the origin row and prevent duplicate imports.

ALTER TABLE transactions ADD COLUMN spreadsheet_id TEXT NOT NULL DEFAULT '';
ALTER TABLE transactions ADD COLUMN row_index      INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_source
  ON transactions(spreadsheet_id, row_index);
