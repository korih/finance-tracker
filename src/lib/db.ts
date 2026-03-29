import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Transaction } from "./stats";

export interface TransactionRow {
  id: number;
  timestamp: string;
  merchant: string;
  name: string;
  amount: number;
  card: string;
  inserted_at: string;
  spreadsheet_id: string;
  row_index: number | null; // NULL for manually entered transactions
  source: "api" | "manual" | "recurring";
  excluded: number; // 0 = active, 1 = soft-deleted
  recurring_rule_id: number | null;
  category: string | null;
}

export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as { DB: D1Database }).DB;
}

/**
 * Returns the highest row_index stored in D1 for the given spreadsheet.
 * Returns 0 if no rows have been synced yet (triggers a full initial load).
 * NULL row_index values (manual entries) are ignored by MAX().
 */
export async function getMaxRowIndex(
  db: D1Database,
  spreadsheetId: string
): Promise<number> {
  const result = await db
    .prepare(
      `SELECT MAX(row_index) AS max_row FROM transactions WHERE spreadsheet_id = ?`
    )
    .bind(spreadsheetId)
    .first<{ max_row: number | null }>();

  return result?.max_row ?? 0;
}

/**
 * Fetch active (non-excluded) transactions for stats and charts.
 * Ordered newest-first by timestamp.
 */
export async function queryTransactions(
  db: D1Database,
  spreadsheetId: string
): Promise<Transaction[]> {
  const result = await db
    .prepare(
      `SELECT timestamp, merchant, name, amount, card, category
       FROM transactions
       WHERE spreadsheet_id = ? AND amount > 0 AND excluded = 0
       ORDER BY timestamp DESC`
    )
    .bind(spreadsheetId)
    .all<Transaction>();

  return result.results;
}

/**
 * Fetch all transactions including excluded ones, for the transactions table.
 * Excluded rows are returned so the UI can show them greyed out.
 */
export async function queryAllTransactions(
  db: D1Database,
  spreadsheetId: string
): Promise<TransactionRow[]> {
  const result = await db
    .prepare(
      `SELECT id, timestamp, merchant, name, amount, card,
              inserted_at, spreadsheet_id, row_index, source, excluded, recurring_rule_id, category
       FROM transactions
       WHERE spreadsheet_id = ? AND amount > 0
       ORDER BY timestamp DESC`
    )
    .bind(spreadsheetId)
    .all<TransactionRow>();

  return result.results;
}

/**
 * Return the distinct card names seen for a spreadsheet (non-excluded, active).
 * Used to populate the card dropdown when adding a manual transaction.
 */
export async function getDistinctCards(
  db: D1Database,
  spreadsheetId: string
): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT DISTINCT card FROM transactions
       WHERE spreadsheet_id = ? AND card != '' AND card != 'Unknown' AND excluded = 0
       ORDER BY card ASC`
    )
    .bind(spreadsheetId)
    .all<{ card: string }>();

  return result.results.map((r) => r.card);
}

/** Distinct merchant names for autocomplete suggestions. */
export async function getDistinctMerchants(
  db: D1Database,
  spreadsheetId: string
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT merchant FROM transactions
       WHERE spreadsheet_id = ? AND merchant != '' AND excluded = 0
       ORDER BY merchant ASC`
    )
    .bind(spreadsheetId)
    .all<{ merchant: string }>();
  return results.map((r) => r.merchant);
}

/** Distinct income sources for autocomplete suggestions. */
export async function getDistinctSources(
  db: D1Database,
  spreadsheetId: string
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT source FROM income_entries
       WHERE spreadsheet_id = ? AND source != ''
       ORDER BY source ASC`
    )
    .bind(spreadsheetId)
    .all<{ source: string }>();
  return results.map((r) => r.source);
}

/** Hard-delete a manually entered transaction. */
export async function hardDeleteTransaction(
  db: D1Database,
  id: number
): Promise<void> {
  await db
    .prepare(`DELETE FROM transactions WHERE id = ? AND source = 'manual'`)
    .bind(id)
    .run();
}

/**
 * Soft-delete a sheet or recurring transaction (marks excluded = 1).
 * Recurring entries are excluded rather than hard-deleted so the unique index
 * prevents them from being regenerated on the next page load.
 */
export async function softDeleteTransaction(
  db: D1Database,
  id: number
): Promise<void> {
  await db
    .prepare(`UPDATE transactions SET excluded = 1 WHERE id = ? AND source IN ('api', 'recurring')`)
    .bind(id)
    .run();
}

/** Restore a soft-deleted sheet transaction (marks excluded = 0). */
export async function restoreTransaction(
  db: D1Database,
  id: number
): Promise<void> {
  await db
    .prepare(`UPDATE transactions SET excluded = 0 WHERE id = ? AND source = 'api'`)
    .bind(id)
    .run();
}
