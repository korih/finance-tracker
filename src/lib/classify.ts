/**
 * classify.ts — Transaction category classification engine.
 *
 * Architecture: a pipeline of Classifiers tried in order.
 * To add a new classification strategy (AI, embeddings, manual override…):
 *   1. Implement the Classifier interface
 *   2. Push an instance into CLASSIFIERS (or prepend for higher priority)
 *
 * The first classifier to return a non-null result wins.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  spreadsheet_id: string;
  name: string;
  color: string;
  /** Regex pattern strings — stored as JSON in D1, parsed on read */
  patterns: string[];
  sort_order: number;
  inserted_at: string;
}

/**
 * Extension point: implement this interface to add a new classifier.
 * Each classifier receives the merchant string and the full category list.
 */
export interface Classifier {
  readonly name: string;
  classify(merchant: string, categories: Category[]): string | null;
}

// ── Built-in classifiers ─────────────────────────────────────────────────────

/**
 * Pattern classifier: tests the merchant string against each category's
 * regex patterns. Case-insensitive. Malformed patterns are silently skipped.
 */
export class PatternClassifier implements Classifier {
  readonly name = "pattern";

  classify(merchant: string, categories: Category[]): string | null {
    const m = merchant.trim();
    for (const cat of categories) {
      for (const pattern of cat.patterns) {
        if (!pattern.trim()) continue;
        try {
          if (new RegExp(pattern, "i").test(m)) return cat.name;
        } catch {
          // malformed regex — skip without crashing
        }
      }
    }
    return null;
  }
}

/**
 * The active pipeline. Order matters: first match wins.
 * Future classifiers (AI, user-override cache, etc.) can be prepended here.
 */
const CLASSIFIERS: Classifier[] = [new PatternClassifier()];

// ── DB helpers ───────────────────────────────────────────────────────────────

type RawCategory = Omit<Category, "patterns"> & { patterns: string };

function parseCategory(raw: RawCategory): Category {
  return { ...raw, patterns: JSON.parse(raw.patterns || "[]") as string[] };
}

export async function getCategories(
  db: D1Database,
  spreadsheetId: string
): Promise<Category[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM categories
       WHERE spreadsheet_id = ?
       ORDER BY sort_order ASC, name ASC`
    )
    .bind(spreadsheetId)
    .all<RawCategory>();
  return results.map(parseCategory);
}

export async function createCategory(
  db: D1Database,
  data: { spreadsheetId: string; name: string; color: string; patterns: string[] }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO categories (spreadsheet_id, name, color, patterns)
       VALUES (?, ?, ?, ?)`
    )
    .bind(data.spreadsheetId, data.name, data.color, JSON.stringify(data.patterns))
    .run();
}

export async function updateCategory(
  db: D1Database,
  id: number,
  spreadsheetId: string,
  data: Partial<Pick<Category, "name" | "color" | "patterns">>
): Promise<void> {
  const sets: string[] = [];
  const binds: unknown[] = [];

  if (data.name     !== undefined) { sets.push("name = ?");     binds.push(data.name); }
  if (data.color    !== undefined) { sets.push("color = ?");    binds.push(data.color); }
  if (data.patterns !== undefined) { sets.push("patterns = ?"); binds.push(JSON.stringify(data.patterns)); }

  if (sets.length === 0) return;
  binds.push(id, spreadsheetId);

  await db
    .prepare(`UPDATE categories SET ${sets.join(", ")} WHERE id = ? AND spreadsheet_id = ?`)
    .bind(...binds)
    .run();
}

export async function deleteCategory(
  db: D1Database,
  id: number,
  spreadsheetId: string
): Promise<void> {
  // Clear the denormalised category on affected rows before deleting
  const cat = await db
    .prepare(`SELECT name FROM categories WHERE id = ? AND spreadsheet_id = ?`)
    .bind(id, spreadsheetId)
    .first<{ name: string }>();

  if (cat) {
    await db.batch([
      db.prepare(`UPDATE transactions   SET category = NULL WHERE spreadsheet_id = ? AND category = ?`).bind(spreadsheetId, cat.name),
      db.prepare(`UPDATE income_entries SET category = NULL WHERE spreadsheet_id = ? AND category = ?`).bind(spreadsheetId, cat.name),
      db.prepare(`DELETE FROM categories WHERE id = ? AND spreadsheet_id = ?`).bind(id, spreadsheetId),
    ]);
  }
}

// ── Classification pipeline ──────────────────────────────────────────────────

/**
 * Classify all transactions + income entries that have no category yet.
 * Runs through CLASSIFIERS in order; first match wins.
 * Safe to call on every page load — only touches NULL-category rows.
 */
export async function classifyAll(
  db: D1Database,
  spreadsheetId: string
): Promise<void> {
  const categories = await getCategories(db, spreadsheetId);
  if (categories.length === 0) return;

  const [{ results: txns }, { results: income }] = await Promise.all([
    db
      .prepare(`SELECT id, merchant FROM transactions WHERE spreadsheet_id = ? AND category IS NULL AND excluded = 0`)
      .bind(spreadsheetId)
      .all<{ id: number; merchant: string }>(),
    db
      .prepare(`SELECT id, source FROM income_entries WHERE spreadsheet_id = ? AND category IS NULL`)
      .bind(spreadsheetId)
      .all<{ id: number; source: string }>(),
  ]);

  const stmts: ReturnType<D1Database["prepare"]>[] = [];

  for (const tx of txns) {
    for (const clf of CLASSIFIERS) {
      const cat = clf.classify(tx.merchant, categories);
      if (cat) {
        stmts.push(
          db.prepare(`UPDATE transactions SET category = ? WHERE id = ?`).bind(cat, tx.id)
        );
        break;
      }
    }
  }

  for (const entry of income) {
    for (const clf of CLASSIFIERS) {
      const cat = clf.classify(entry.source, categories);
      if (cat) {
        stmts.push(
          db.prepare(`UPDATE income_entries SET category = ? WHERE id = ?`).bind(cat, entry.id)
        );
        break;
      }
    }
  }

  if (stmts.length > 0) await db.batch(stmts);
}

/**
 * Re-classify all rows that currently belong to the given category names,
 * plus all NULL-category rows. Call after updating category patterns.
 */
export async function reclassifyCategories(
  db: D1Database,
  spreadsheetId: string,
  affectedCategoryNames: string[]
): Promise<void> {
  if (affectedCategoryNames.length === 0) {
    return classifyAll(db, spreadsheetId);
  }

  const placeholders = affectedCategoryNames.map(() => "?").join(", ");

  await db.batch([
    db.prepare(`UPDATE transactions   SET category = NULL WHERE spreadsheet_id = ? AND category IN (${placeholders})`).bind(spreadsheetId, ...affectedCategoryNames),
    db.prepare(`UPDATE income_entries SET category = NULL WHERE spreadsheet_id = ? AND category IN (${placeholders})`).bind(spreadsheetId, ...affectedCategoryNames),
  ]);

  return classifyAll(db, spreadsheetId);
}
