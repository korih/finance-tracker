export interface Budget {
  id: number;
  spreadsheet_id: string;
  user_id: string;
  /** Empty string = overall monthly budget; any other value = per-category limit. */
  category: string;
  amount: number;
  inserted_at: string;
}

/** Fetch all budgets for a spreadsheet (total + all category limits). */
export async function getBudgets(
  db: D1Database,
  spreadsheetId: string
): Promise<Budget[]> {
  const { results } = await db
    .prepare(`SELECT * FROM budgets WHERE spreadsheet_id = ? ORDER BY category ASC`)
    .bind(spreadsheetId)
    .all<Budget>();
  return results;
}

/**
 * Upsert a budget amount.
 * category = '' sets the overall monthly budget.
 * category = 'Food' sets a per-category limit.
 */
export async function setBudget(
  db: D1Database,
  spreadsheetId: string,
  userId: string,
  category: string,
  amount: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO budgets (spreadsheet_id, user_id, category, amount)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(spreadsheet_id, category) DO UPDATE SET amount = excluded.amount, user_id = excluded.user_id`
    )
    .bind(spreadsheetId, userId, category, amount)
    .run();
}

/** Remove a per-category budget limit. */
export async function removeCategoryBudget(
  db: D1Database,
  spreadsheetId: string,
  category: string
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM budgets WHERE spreadsheet_id = ? AND category = ? AND category != ''`
    )
    .bind(spreadsheetId, category)
    .run();
}
