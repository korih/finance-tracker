export type RecurrenceType = "daily" | "weekly" | "monthly" | "custom";

export interface RecurringRule {
  id: number;
  spreadsheet_id: string;
  entry_type: "expense" | "income";
  // expense fields
  merchant: string | null;
  card: string | null;
  // income fields
  income_source: string | null;
  income_type: "income" | "interest" | "other" | null;
  // common
  amount: number;
  recurrence_type: RecurrenceType;
  recurrence_days: number | null; // for 'custom'
  start_date: string;             // YYYY-MM-DD
  last_generated_date: string | null;
  next_due_date: string;          // YYYY-MM-DD
  inserted_at: string;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Advance a date by one recurrence interval. */
function advanceDate(d: Date, rule: RecurringRule): Date {
  const next = new Date(d);
  switch (rule.recurrence_type) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "custom":
      next.setDate(next.getDate() + (rule.recurrence_days ?? 30));
      break;
  }
  return next;
}

/**
 * Return every date that should be generated for this rule up to and including today.
 * If nothing has been generated yet, starts from start_date.
 * Otherwise starts from last_generated_date + 1 interval.
 */
function pendingDates(rule: RecurringRule, today: Date): Date[] {
  const base = rule.last_generated_date
    ? new Date(`${rule.last_generated_date}T12:00:00`)
    : new Date(`${rule.start_date}T12:00:00`);

  // If nothing generated yet, include start_date itself; otherwise start AFTER last
  let current = rule.last_generated_date ? advanceDate(base, rule) : base;
  today.setHours(23, 59, 59, 0); // include full today

  const dates: Date[] = [];
  while (current <= today) {
    dates.push(new Date(current));
    current = advanceDate(current, rule);
  }
  return dates;
}

// ─── DB operations ────────────────────────────────────────────────────────────

export async function getRecurringRules(
  db: D1Database,
  spreadsheetId: string,
  entryType?: "expense" | "income"
): Promise<RecurringRule[]> {
  const query = entryType
    ? `SELECT * FROM recurring_rules WHERE spreadsheet_id = ? AND entry_type = ? ORDER BY inserted_at ASC`
    : `SELECT * FROM recurring_rules WHERE spreadsheet_id = ? ORDER BY inserted_at ASC`;
  const result = entryType
    ? await db.prepare(query).bind(spreadsheetId, entryType).all<RecurringRule>()
    : await db.prepare(query).bind(spreadsheetId).all<RecurringRule>();
  return result.results;
}

export async function createRecurringRule(
  db: D1Database,
  rule: Omit<RecurringRule, "id" | "last_generated_date" | "inserted_at">
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO recurring_rules
         (spreadsheet_id, entry_type, merchant, card, income_source, income_type,
          amount, recurrence_type, recurrence_days, start_date, last_generated_date, next_due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
    )
    .bind(
      rule.spreadsheet_id, rule.entry_type,
      rule.merchant ?? null, rule.card ?? null,
      rule.income_source ?? null, rule.income_type ?? null,
      rule.amount, rule.recurrence_type, rule.recurrence_days ?? null,
      rule.start_date, rule.next_due_date
    )
    .run();
}

export async function removeRecurringRule(
  db: D1Database,
  id: number,
  spreadsheetId: string
): Promise<void> {
  // Nullify the rule reference on generated entries so they become standalone records
  await db
    .prepare(`UPDATE transactions SET recurring_rule_id = NULL WHERE recurring_rule_id = ? AND spreadsheet_id = ?`)
    .bind(id, spreadsheetId)
    .run();
  await db
    .prepare(`UPDATE income_entries SET recurring_rule_id = NULL WHERE recurring_rule_id = ? AND spreadsheet_id = ?`)
    .bind(id, spreadsheetId)
    .run();
  await db.prepare(`DELETE FROM recurring_rules WHERE id = ? AND spreadsheet_id = ?`).bind(id, spreadsheetId).run();
}

/**
 * Check for due recurring rules and generate all pending entries in one atomic batch.
 *
 * Safety guarantees:
 *  - INSERT OR IGNORE + partial unique index (recurring_rule_id, timestamp/date)
 *    prevents duplicate entries on concurrent page loads.
 *  - Rule update is idempotent: concurrent loads compute the same last/next dates.
 */
export async function processRecurringRules(
  db: D1Database,
  spreadsheetId: string
): Promise<void> {
  const today = new Date();
  const todayStr = toDateStr(today);

  const { results: dueRules } = await db
    .prepare(
      `SELECT * FROM recurring_rules WHERE spreadsheet_id = ? AND next_due_date <= ?`
    )
    .bind(spreadsheetId, todayStr)
    .all<RecurringRule>();

  if (dueRules.length === 0) return;

  const stmts: ReturnType<D1Database["prepare"]>[] = [];

  for (const rule of dueRules) {
    const dates = pendingDates(rule, today);
    if (dates.length === 0) continue;

    for (const d of dates) {
      const dateStr = toDateStr(d);

      if (rule.entry_type === "expense") {
        stmts.push(
          db
            .prepare(
              `INSERT OR IGNORE INTO transactions
                 (timestamp, merchant, name, amount, card,
                  spreadsheet_id, row_index, source, excluded, recurring_rule_id)
               VALUES (?, ?, '', ?, ?, ?, NULL, 'recurring', 0, ?)`
            )
            .bind(dateStr, rule.merchant ?? "", rule.amount, rule.card ?? "", spreadsheetId, rule.id)
        );
      } else {
        stmts.push(
          db
            .prepare(
              `INSERT OR IGNORE INTO income_entries
                 (spreadsheet_id, source, type, amount, date, recurring_rule_id)
               VALUES (?, ?, ?, ?, ?, ?)`
            )
            .bind(spreadsheetId, rule.income_source ?? "", rule.income_type ?? "income", rule.amount, dateStr, rule.id)
        );
      }
    }

    const lastGenerated = toDateStr(dates[dates.length - 1]);
    const nextDue = toDateStr(advanceDate(dates[dates.length - 1], rule));

    stmts.push(
      db
        .prepare(
          `UPDATE recurring_rules SET last_generated_date = ?, next_due_date = ? WHERE id = ?`
        )
        .bind(lastGenerated, nextDue, rule.id)
    );
  }

  if (stmts.length > 0) {
    await db.batch(stmts);
  }
}
