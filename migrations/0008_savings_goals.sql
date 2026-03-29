-- Savings goals: user-defined targets with a current progress amount
CREATE TABLE IF NOT EXISTS savings_goals (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  spreadsheet_id TEXT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  target_amount  REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  color          TEXT NOT NULL DEFAULT '#a78bfa',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  inserted_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_spreadsheet ON savings_goals(spreadsheet_id);
