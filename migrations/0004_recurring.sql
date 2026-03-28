-- Add recurring expense fields to transactions.
-- Only manually-entered transactions can be recurring.
--
-- is_recurring:       1 = recurring expense, 0 = one-time
-- recurrence_type:    'daily' | 'weekly' | 'monthly' | 'custom'
-- recurrence_custom:  free-text description for 'custom' type (e.g. "every 2 months")

ALTER TABLE transactions ADD COLUMN is_recurring   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN recurrence_type   TEXT;
ALTER TABLE transactions ADD COLUMN recurrence_custom TEXT;
