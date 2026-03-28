import { getSheetHeaders, getSheetRowsFrom } from "./google-sheets";
import { getMaxRowIndex } from "./db";

function findCol(headers: string[], ...terms: string[]): number {
  return headers.findIndex((h) =>
    terms.some((t) => h.trim().toLowerCase().includes(t.toLowerCase()))
  );
}

function parseAmount(raw: string): number {
  const n = parseFloat(raw.replace(/[$,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

/**
 * Smart sync: only fetches rows from the spreadsheet that the DB hasn't seen yet.
 *
 * 1. Query DB for the highest row_index already stored for this spreadsheet.
 * 2. Ask Google Sheets for rows that come after that index.
 * 3. Upsert only those new rows — existing rows are never re-fetched or modified.
 *
 * Returns how many new rows were written to D1 (0 if already up to date).
 */
export async function syncTransactions(
  db: D1Database,
  accessToken: string,
  spreadsheetId: string
): Promise<{ newRows: number }> {
  // Step 1: find where we left off
  const maxRowIndex = await getMaxRowIndex(db, spreadsheetId);

  // Step 2: fetch only the rows we haven't seen yet
  const [headers, { rows, firstRowIndex }] = await Promise.all([
    getSheetHeaders(accessToken, spreadsheetId),
    getSheetRowsFrom(accessToken, spreadsheetId, maxRowIndex),
  ]);

  if (rows.length === 0) {
    return { newRows: 0 }; // nothing new in the sheet
  }

  // Detect column positions from headers (done once)
  const iTimestamp = findCol(headers, "timestamp", "date", "time");
  const iMerchant  = findCol(headers, "merchant", "vendor", "store");
  const iName      = findCol(headers, "name");
  const iAmount    = findCol(headers, "amount", "total", "price", "cost");
  const iCard      = findCol(headers, "card", "account", "payment");

  // Step 3: build upsert statements for each new row
  // row_index is assigned sequentially starting from firstRowIndex
  const stmts = rows.map((row, i) =>
    db
      .prepare(
        `INSERT INTO transactions
           (timestamp, merchant, name, amount, card, spreadsheet_id, row_index, source, excluded)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sheet', 0)
         ON CONFLICT DO UPDATE SET
           timestamp = excluded.timestamp,
           merchant  = excluded.merchant,
           name      = excluded.name,
           amount    = excluded.amount,
           card      = excluded.card`
      )
      .bind(
        iTimestamp >= 0 ? (row[iTimestamp] ?? "") : "",
        iMerchant  >= 0 ? (row[iMerchant]  ?? "Unknown") : "Unknown",
        iName      >= 0 ? (row[iName]      ?? "") : "",
        iAmount    >= 0 ? parseAmount(row[iAmount] ?? "") : 0,
        iCard      >= 0 ? (row[iCard]      ?? "Unknown") : "Unknown",
        spreadsheetId,
        firstRowIndex + i  // row_index is 1-based, increments per row
      )
  );

  await db.batch(stmts);

  return { newRows: rows.length };
}
