CREATE TABLE IF NOT EXISTS budgets (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  spreadsheet_id TEXT    NOT NULL,
  user_id        TEXT    NOT NULL DEFAULT '',
  -- '' = overall monthly budget; any other value = per-category budget
  category       TEXT    NOT NULL DEFAULT '',
  amount         REAL    NOT NULL,
  inserted_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(spreadsheet_id, category)
);

CREATE INDEX IF NOT EXISTS idx_budgets_spreadsheet ON budgets(spreadsheet_id);
