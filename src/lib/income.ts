import { getCloudflareContext } from "@opennextjs/cloudflare";

export type IncomePeriod = "year" | "all";
export type IncomeType = "income" | "interest" | "other";

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  income:   "Income",
  interest: "Interest",
  other:    "Other",
};

export interface IncomeEntry {
  id: number;
  spreadsheet_id: string;
  source: string;
  type: IncomeType;
  amount: number;
  date: string; // YYYY-MM-DD
  recurring_rule_id: number | null;
  inserted_at: string;
  category: string | null;
}

export interface IncomeBreakdownEntry {
  key: string;
  label: string;
  total: number;
  isCurrent: boolean;
}

export interface IncomeStats {
  totalIncome: number;
  avgLabel: string;         // "/ month" or "/ year"
  avgAmount: number;
  largestEntry: { amount: number; source: string };
  entryCount: number;
  breakdown: IncomeBreakdownEntry[];
  byType: { type: string; label: string; total: number; pct: number }[];
}

// ─── DB ──────────────────────────────────────────────────────────────────────

async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as { DB: D1Database }).DB;
}

export async function fetchIncomeEntries(
  spreadsheetId: string,
  period: IncomePeriod,
  year?: number
): Promise<IncomeEntry[]> {
  const db = await getDB();
  const y = year ?? new Date().getFullYear();

  const query =
    period === "year"
      ? `SELECT * FROM income_entries
         WHERE spreadsheet_id = ? AND strftime('%Y', date) = ?
         ORDER BY date DESC`
      : `SELECT * FROM income_entries
         WHERE spreadsheet_id = ?
         ORDER BY date DESC`;

  const result =
    period === "year"
      ? await db.prepare(query).bind(spreadsheetId, String(y)).all<IncomeEntry>()
      : await db.prepare(query).bind(spreadsheetId).all<IncomeEntry>();

  return result.results;
}

export async function insertIncomeEntry(data: {
  spreadsheetId: string;
  source: string;
  type: IncomeType;
  amount: number;
  date: string;
}): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      `INSERT INTO income_entries (spreadsheet_id, source, type, amount, date)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(data.spreadsheetId, data.source, data.type, data.amount, data.date)
    .run();
}

export async function deleteIncomeEntry(id: number): Promise<void> {
  const db = await getDB();
  await db.prepare(`DELETE FROM income_entries WHERE id = ?`).bind(id).run();
}

// ─── Stats computation ────────────────────────────────────────────────────────

export function computeIncomeStats(
  entries: IncomeEntry[],
  period: IncomePeriod,
  year?: number
): IncomeStats {
  const now = new Date();
  const y = year ?? now.getFullYear();

  if (entries.length === 0) {
    return {
      totalIncome: 0,
      avgLabel: period === "year" ? "/ month" : "/ year",
      avgAmount: 0,
      largestEntry: { amount: 0, source: "" },
      entryCount: 0,
      breakdown: period === "year" ? buildYearBreakdown([], y, now) : [],
      byType: [],
    };
  }

  const totalIncome = entries.reduce((s, e) => s + e.amount, 0);
  const largest = entries.reduce((m, e) => (e.amount > m.amount ? e : m), entries[0]);

  // Avg
  let avgLabel: string;
  let avgAmount: number;
  if (period === "year") {
    avgLabel = "/ month";
    // Only divide by months that have actually occurred
    const monthsElapsed = y === now.getFullYear() ? now.getMonth() + 1 : 12;
    avgAmount = totalIncome / monthsElapsed;
  } else {
    avgLabel = "/ year";
    const years = computeYearsSpanned(entries);
    avgAmount = totalIncome / Math.max(1, years);
  }

  // Breakdown
  const breakdown =
    period === "year"
      ? buildYearBreakdown(entries, y, now)
      : buildAllTimeBreakdown(entries, now);

  // By type
  const typeMap = new Map<IncomeType, number>();
  for (const e of entries) {
    typeMap.set(e.type, (typeMap.get(e.type) ?? 0) + e.amount);
  }
  const byType = Array.from(typeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, total]) => ({
      type,
      label: INCOME_TYPE_LABELS[type] ?? type,
      total: Math.round(total * 100) / 100,
      pct: Math.round((total / totalIncome) * 100),
    }));

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    avgLabel,
    avgAmount: Math.round(avgAmount * 100) / 100,
    largestEntry: { amount: largest.amount, source: largest.source },
    entryCount: entries.length,
    breakdown,
    byType,
  };
}

function computeYearsSpanned(entries: IncomeEntry[]): number {
  const dates = entries.map((e) => new Date(e.date)).filter((d) => !isNaN(d.getTime()));
  if (dates.length === 0) return 1;
  const minYear = Math.min(...dates.map((d) => d.getFullYear()));
  const maxYear = Math.max(...dates.map((d) => d.getFullYear()));
  return Math.max(1, maxYear - minYear + 1);
}

/** Year period: show months up to the current month (no future zero bars). */
function buildYearBreakdown(
  entries: IncomeEntry[],
  year: number,
  now: Date
): IncomeBreakdownEntry[] {
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;

  const bucketMap = new Map<string, number>();
  for (let m = 1; m <= maxMonth; m++) {
    bucketMap.set(`${year}-${String(m).padStart(2, "0")}`, 0);
  }
  for (const e of entries) {
    const key = e.date.slice(0, 7); // YYYY-MM
    if (bucketMap.has(key)) bucketMap.set(key, (bucketMap.get(key) ?? 0) + e.amount);
  }

  return Array.from(bucketMap.keys())
    .sort()
    .map((key) => {
      const [, m] = key.split("-");
      const d = new Date(year, parseInt(m) - 1);
      return {
        key,
        label: d.toLocaleString("default", { month: "short" }),
        total: Math.round((bucketMap.get(key) ?? 0) * 100) / 100,
        isCurrent: key === currentKey,
      };
    });
}

/** All-time period: group by year, no zero-fill. */
function buildAllTimeBreakdown(
  entries: IncomeEntry[],
  now: Date
): IncomeBreakdownEntry[] {
  const currentKey = String(now.getFullYear());
  const bucketMap = new Map<string, number>();
  for (const e of entries) {
    const key = e.date.slice(0, 4); // YYYY
    bucketMap.set(key, (bucketMap.get(key) ?? 0) + e.amount);
  }
  return Array.from(bucketMap.keys())
    .sort()
    .map((key) => ({
      key,
      label: key,
      total: Math.round((bucketMap.get(key) ?? 0) * 100) / 100,
      isCurrent: key === currentKey,
    }));
}
