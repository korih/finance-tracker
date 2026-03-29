export type Subscription = "free" | "premium";

export const FREE_ENTRY_LIMIT = 200;

export interface UserAccount {
  user_id: string;
  api_id: string;
  spreadsheet_id: string;
  subscription: Subscription;
  inserted_at: string;
}

/**
 * Returns the combined count of transactions + income_entries for a spreadsheet.
 * Used to enforce the free-tier limit.
 */
export async function getEntryCount(
  db: D1Database,
  spreadsheetId: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM transactions   WHERE spreadsheet_id = ? AND excluded = 0) +
         (SELECT COUNT(*) FROM income_entries WHERE spreadsheet_id = ?)
       AS total`
    )
    .bind(spreadsheetId, spreadsheetId)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

/**
 * Throws if a free-tier account has reached the entry limit.
 */
export async function assertBelowEntryLimit(
  db: D1Database,
  account: UserAccount
): Promise<void> {
  if (account.subscription === "premium") return;
  const count = await getEntryCount(db, account.spreadsheet_id);
  if (count >= FREE_ENTRY_LIMIT) {
    throw new Error(
      `Free plan limit reached (${FREE_ENTRY_LIMIT} entries). Upgrade to premium for unlimited entries.`
    );
  }
}

/**
 * Returns the user's account, creating one on first sign-in.
 *
 * On first sign-in, looks for orphaned data rows (user_id = '') left over
 * from before the user_accounts migration. If exactly one spreadsheet_id is
 * found across all data tables, that ID is adopted as the user's account and
 * all orphaned rows are claimed. This makes the migration seamless — no manual
 * SQL required.
 *
 * If no orphaned data exists (fresh install), a new UUID is generated.
 */
export async function getOrCreateUserAccount(
  db: D1Database,
  userId: string
): Promise<UserAccount> {
  const existing = await db
    .prepare(`SELECT * FROM user_accounts WHERE user_id = ?`)
    .bind(userId)
    .first<UserAccount>();

  if (existing) return existing;

  // Detect any orphaned spreadsheet_ids across all data tables
  const { results: orphaned } = await db
    .prepare(
      `SELECT spreadsheet_id FROM (
         SELECT spreadsheet_id FROM transactions    WHERE user_id = ''
         UNION
         SELECT spreadsheet_id FROM income_entries  WHERE user_id = ''
         UNION
         SELECT spreadsheet_id FROM categories      WHERE user_id = ''
         UNION
         SELECT spreadsheet_id FROM recurring_rules WHERE user_id = ''
         UNION
         SELECT spreadsheet_id FROM savings_goals   WHERE user_id = ''
       )
       LIMIT 2`
    )
    .all<{ spreadsheet_id: string }>();

  const apiId = crypto.randomUUID();
  let spreadsheetId: string;

  if (orphaned.length === 1) {
    // Exactly one orphaned spreadsheet_id — adopt it and claim all its data
    spreadsheetId = orphaned[0].spreadsheet_id;
    await db.batch([
      db.prepare(`UPDATE transactions    SET user_id = ? WHERE spreadsheet_id = ? AND user_id = ''`).bind(userId, spreadsheetId),
      db.prepare(`UPDATE income_entries  SET user_id = ? WHERE spreadsheet_id = ? AND user_id = ''`).bind(userId, spreadsheetId),
      db.prepare(`UPDATE categories      SET user_id = ? WHERE spreadsheet_id = ? AND user_id = ''`).bind(userId, spreadsheetId),
      db.prepare(`UPDATE recurring_rules SET user_id = ? WHERE spreadsheet_id = ? AND user_id = ''`).bind(userId, spreadsheetId),
      db.prepare(`UPDATE savings_goals   SET user_id = ? WHERE spreadsheet_id = ? AND user_id = ''`).bind(userId, spreadsheetId),
    ]);
  } else {
    // Fresh install or ambiguous data — generate a clean new ID
    spreadsheetId = crypto.randomUUID();
  }

  await db
    .prepare(`INSERT INTO user_accounts (user_id, api_id, spreadsheet_id) VALUES (?, ?, ?)`)
    .bind(userId, apiId, spreadsheetId)
    .run();

  return {
    user_id:        userId,
    api_id:         apiId,
    spreadsheet_id: spreadsheetId,
    subscription:   "free",
    inserted_at:    new Date().toISOString(),
  };
}

/** Look up an account by its API ID (used by the ingest endpoint). */
export async function getUserAccountByApiId(
  db: D1Database,
  apiId: string
): Promise<UserAccount | null> {
  return (
    (await db
      .prepare(`SELECT * FROM user_accounts WHERE api_id = ?`)
      .bind(apiId)
      .first<UserAccount>()) ?? null
  );
}

/** Generate a new API ID for the user. The old one is immediately invalidated. */
export async function regenerateApiId(
  db: D1Database,
  userId: string
): Promise<string> {
  const newApiId = crypto.randomUUID();
  await db
    .prepare(`UPDATE user_accounts SET api_id = ? WHERE user_id = ?`)
    .bind(newApiId, userId)
    .run();
  return newApiId;
}
