ALTER TABLE categories ADD COLUMN hide_from_merchants INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN hide_from_chart     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN hide_from_stats     INTEGER NOT NULL DEFAULT 0;

-- Migrate any rows already flagged with the old single `hidden` column
UPDATE categories
SET hide_from_merchants = hidden,
    hide_from_chart     = hidden,
    hide_from_stats     = hidden
WHERE hidden = 1;
