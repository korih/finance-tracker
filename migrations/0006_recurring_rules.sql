-- Replace column-level recurring flags with a dedicated recurring_rules table.
--
-- recurring_rules: the authoritative list of recurring schedules.
--   entry_type:         'expense' | 'income'
--   merchant/card:      for expense rules
--   income_source/type: for income rules
--   recurrence_type:    'daily' | 'weekly' | 'monthly' | 'custom'
--   recurrence_days:    interval in days for 'custom'
--   start_date:         YYYY-MM-DD first occurrence (user-chosen date)
--   last_generated_date YYYY-MM-DD last entry written to the ledger (NULL = nothing yet)
--   next_due_date:      YYYY-MM-DD next date to run generation (= start_date initially)
--
-- On each page load, processRecurringRules() queries WHERE next_due_date <= today,
-- generates all due entries via INSERT OR IGNORE, then advances last_generated_date
-- and next_due_date.  Concurrent loads are safe because:
--   1. INSERT OR IGNORE on a partial unique index prevents duplicate entries.
--   2. The rule UPDATE is idempotent (both loads compute the same result).

CREATE TABLE IF NOT EXISTS recurring_rules (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  spreadsheet_id      TEXT    NOT NULL,
  entry_type          TEXT    NOT NULL,   -- 'expense' | 'income'
  merchant            TEXT,               -- expense only
  card                TEXT,               -- expense only
  income_source       TEXT,               -- income only
  income_type         TEXT,               -- income only: 'income'|'interest'|'other'
  amount              REAL    NOT NULL,
  recurrence_type     TEXT    NOT NULL,   -- 'daily'|'weekly'|'monthly'|'custom'
  recurrence_days     INTEGER,            -- days between entries for 'custom'
  start_date          TEXT    NOT NULL,   -- YYYY-MM-DD
  last_generated_date TEXT,               -- YYYY-MM-DD, NULL until first run
  next_due_date       TEXT    NOT NULL,   -- YYYY-MM-DD (= start_date on creation)
  inserted_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recurring_spreadsheet ON recurring_rules(spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_recurring_due         ON recurring_rules(next_due_date);

-- ── Recreate transactions: drop old recurring cols, add recurring_rule_id ─────

CREATE TABLE transactions_v6 (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp         TEXT    NOT NULL,
  merchant          TEXT    NOT NULL,
  name              TEXT    NOT NULL,
  amount            REAL    NOT NULL,
  card              TEXT    NOT NULL,
  inserted_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  spreadsheet_id    TEXT    NOT NULL DEFAULT '',
  row_index         INTEGER,
  source            TEXT    NOT NULL DEFAULT 'sheet', -- 'sheet'|'manual'|'recurring'
  excluded          INTEGER NOT NULL DEFAULT 0,
  recurring_rule_id INTEGER                           -- FK to recurring_rules.id
);

INSERT INTO transactions_v6
  (id, timestamp, merchant, name, amount, card, inserted_at,
   spreadsheet_id, row_index, source, excluded, recurring_rule_id)
SELECT id, timestamp, merchant, name, amount, card, inserted_at,
       spreadsheet_id, row_index, source, excluded, NULL
FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_v6 RENAME TO transactions;

CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant  ON transactions(merchant);
CREATE INDEX IF NOT EXISTS idx_transactions_card      ON transactions(card);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_sheet_row
  ON transactions(spreadsheet_id, row_index)
  WHERE row_index IS NOT NULL;
-- One generated entry per rule per date — prevents duplicates on concurrent loads
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring
  ON transactions(recurring_rule_id, timestamp)
  WHERE recurring_rule_id IS NOT NULL;

-- ── Recreate income_entries: same treatment ───────────────────────────────────

CREATE TABLE income_entries_v6 (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  spreadsheet_id    TEXT    NOT NULL,
  source            TEXT    NOT NULL,
  type              TEXT    NOT NULL DEFAULT 'income',
  amount            REAL    NOT NULL,
  date              TEXT    NOT NULL,
  recurring_rule_id INTEGER,
  inserted_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO income_entries_v6
  (id, spreadsheet_id, source, type, amount, date, recurring_rule_id, inserted_at)
SELECT id, spreadsheet_id, source, type, amount, date, NULL, inserted_at
FROM income_entries;

DROP TABLE income_entries;
ALTER TABLE income_entries_v6 RENAME TO income_entries;

CREATE INDEX IF NOT EXISTS idx_income_spreadsheet ON income_entries(spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_income_date        ON income_entries(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_income_recurring
  ON income_entries(recurring_rule_id, date)
  WHERE recurring_rule_id IS NOT NULL;
