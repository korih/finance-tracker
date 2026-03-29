export interface SavingsGoal {
  id: number;
  spreadsheet_id: string;
  name: string;
  description: string;
  target_amount: number;
  current_amount: number;
  color: string;
  sort_order: number;
  inserted_at: string;
}

export async function getSavingsGoals(
  db: D1Database,
  spreadsheetId: string
): Promise<SavingsGoal[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM savings_goals WHERE spreadsheet_id = ? ORDER BY sort_order ASC, inserted_at ASC`
    )
    .bind(spreadsheetId)
    .all<SavingsGoal>();
  return results;
}

export async function createSavingsGoal(
  db: D1Database,
  data: {
    spreadsheetId: string;
    name: string;
    description: string;
    targetAmount: number;
    currentAmount: number;
    color: string;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO savings_goals (spreadsheet_id, name, description, target_amount, current_amount, color)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(data.spreadsheetId, data.name, data.description, data.targetAmount, data.currentAmount, data.color)
    .run();
}

export async function updateSavingsGoal(
  db: D1Database,
  id: number,
  spreadsheetId: string,
  data: Partial<Pick<SavingsGoal, "name" | "description" | "target_amount" | "current_amount" | "color">>
): Promise<void> {
  const sets: string[] = [];
  const binds: unknown[] = [];

  if (data.name           !== undefined) { sets.push("name = ?");           binds.push(data.name); }
  if (data.description    !== undefined) { sets.push("description = ?");    binds.push(data.description); }
  if (data.target_amount  !== undefined) { sets.push("target_amount = ?");  binds.push(data.target_amount); }
  if (data.current_amount !== undefined) { sets.push("current_amount = ?"); binds.push(data.current_amount); }
  if (data.color          !== undefined) { sets.push("color = ?");          binds.push(data.color); }

  if (sets.length === 0) return;
  binds.push(id, spreadsheetId);

  await db
    .prepare(`UPDATE savings_goals SET ${sets.join(", ")} WHERE id = ? AND spreadsheet_id = ?`)
    .bind(...binds)
    .run();
}

export async function deleteSavingsGoal(
  db: D1Database,
  id: number,
  spreadsheetId: string
): Promise<void> {
  await db
    .prepare(`DELETE FROM savings_goals WHERE id = ? AND spreadsheet_id = ?`)
    .bind(id, spreadsheetId)
    .run();
}
