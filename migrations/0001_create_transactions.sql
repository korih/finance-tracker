CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp   TEXT    NOT NULL,
  merchant    TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  amount      REAL    NOT NULL,
  card        TEXT    NOT NULL,
  inserted_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant  ON transactions(merchant);
CREATE INDEX IF NOT EXISTS idx_transactions_card      ON transactions(card);
