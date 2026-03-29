import type { SheetData } from "./google-sheets";

export type Period = "day" | "week" | "month" | "year" | "all";

export interface Transaction {
  timestamp: string;
  merchant: string;
  name: string;
  amount: number;
  card: string;
  category?: string | null;
}

export interface SpendingBreakdownEntry {
  key: string;       // sort/identity key (e.g. "2025", "2025-03", "2025-03-24")
  label: string;     // display label for the X axis
  total: number;
  isCurrent: boolean; // true for the bucket containing "now" — used for chart highlight
}

export interface SpendingStats {
  totalSpent: number;
  transactionCount: number;
  avgTransaction: number;
  largestTransaction: { amount: number; merchant: string; date: string };
  spendingBreakdown: SpendingBreakdownEntry[];
  topMerchants: { merchant: string; total: number }[];
  byCard: { card: string; total: number; pct: number }[];
  recentTransactions: Transaction[];
  dateRange: { from: string; to: string } | null;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function findColIndex(headers: string[], ...names: string[]): number {
  return headers.findIndex((h) =>
    names.some((n) => h.trim().toLowerCase().includes(n.toLowerCase()))
  );
}

/** Parse raw sheet rows into typed transactions, filtering out invalid/zero-amount rows. */
export function parseSheetToTransactions(data: SheetData): Transaction[] {
  const { headers, rows } = data;

  const iTimestamp = findColIndex(headers, "timestamp", "date", "time");
  const iMerchant = findColIndex(headers, "merchant", "vendor", "store");
  const iName = findColIndex(headers, "name");
  const iAmount = findColIndex(headers, "amount", "total", "price", "cost");
  const iCard = findColIndex(headers, "card", "account", "payment");

  const transactions: Transaction[] = [];

  for (const row of rows) {
    const amountRaw = iAmount >= 0 ? (row[iAmount] ?? "") : "";
    const amount = parseAmount(amountRaw);
    if (amount <= 0) continue;

    transactions.push({
      timestamp: iTimestamp >= 0 ? (row[iTimestamp] ?? "") : "",
      merchant: iMerchant >= 0 ? (row[iMerchant] ?? "Unknown") : "Unknown",
      name: iName >= 0 ? (row[iName] ?? "") : "",
      amount,
      card: iCard >= 0 ? (row[iCard] ?? "Unknown") : "Unknown",
    });
  }

  return transactions;
}

// ─── Breakdown helpers ────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns the Monday of the ISO week containing d. */
function getWeekStart(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Build the spending breakdown for the chart at the granularity one step below
 * the selected period:
 *   all   → by year
 *   year  → by month
 *   month → by week (Mon week-start as label)
 *   week  → by day  (zero-fills all 7 days)
 *   day   → by day  (single bar)
 */
function buildSpendingBreakdown(
  transactions: Transaction[],
  period: Period,
  localDate?: string
): SpendingBreakdownEntry[] {
  const now = localDate ? new Date(`${localDate}T12:00:00`) : new Date();

  // Which key corresponds to "now" (for chart highlight)
  let currentKey: string;
  if (period === "all")        currentKey = String(now.getFullYear());
  else if (period === "year")  currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  else if (period === "month") currentKey = toDateKey(getWeekStart(now));
  else                         currentKey = toDateKey(now); // week | day

  const bucketMap = new Map<string, number>();

  for (const t of transactions) {
    const d = new Date(t.timestamp);
    if (isNaN(d.getTime())) continue;

    let key: string;
    if (period === "all")        key = String(d.getFullYear());
    else if (period === "year")  key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    else if (period === "month") key = toDateKey(getWeekStart(d));
    else                         key = toDateKey(d); // week | day

    bucketMap.set(key, (bucketMap.get(key) ?? 0) + t.amount);
  }

  // Zero-fill all 7 days of the week so the chart always shows a full week grid
  if (period === "week") {
    const weekStart = getWeekStart(now);
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const k = toDateKey(d);
      if (!bucketMap.has(k)) bucketMap.set(k, 0);
    }
  }

  return Array.from(bucketMap.keys())
    .sort()
    .map((key) => {
      let label: string;
      if (period === "all") {
        label = key; // "2024"
      } else if (period === "year") {
        const [y, m] = key.split("-");
        const d = new Date(parseInt(y), parseInt(m) - 1);
        label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      } else if (period === "month") {
        const d = new Date(`${key}T12:00:00`);
        label = d.toLocaleString("default", { month: "short", day: "numeric" });
      } else {
        const d = new Date(`${key}T12:00:00`);
        label = period === "week"
          ? d.toLocaleString("default", { weekday: "short" })
          : d.toLocaleString("default", { month: "short", day: "numeric" });
      }
      return {
        key,
        label,
        total: Math.round((bucketMap.get(key) ?? 0) * 100) / 100,
        isCurrent: key === currentKey,
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filter transactions to a specific time period.
 *
 * `localDate` should be a YYYY-MM-DD string representing today in the user's
 * local timezone. When omitted the server's UTC clock is used, which may
 * produce wrong results for users in non-UTC timezones near midnight.
 */
export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: Period,
  options?: { year?: number; localDate?: string }
): Transaction[] {
  if (period === "all") return transactions;

  // Anchor "now" to the client's local date when available.
  // Append T12:00:00 so parsing treats it as local noon (avoids UTC-midnight edge cases).
  const now = options?.localDate
    ? new Date(`${options.localDate}T12:00:00`)
    : new Date();

  const year = options?.year;

  return transactions.filter((t) => {
    const d = new Date(t.timestamp);
    if (isNaN(d.getTime())) return false;

    if (period === "day") {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    if (period === "week") {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); // Monday
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      return d >= startOfWeek && d < endOfWeek;
    }
    if (period === "month") {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    }
    if (period === "year") {
      return d.getFullYear() === (year ?? now.getFullYear());
    }
    return true;
  });
}

/** Compute spending stats from an already-parsed list of transactions (e.g. from D1). */
export function computeStatsFromTransactions(
  transactions: Transaction[],
  period: Period = "all",
  localDate?: string,
  hiddenCategories?: { merchants: Set<string>; chart: Set<string>; stats: Set<string> }
): SpendingStats {
  if (transactions.length === 0) {
    return {
      totalSpent: 0,
      transactionCount: 0,
      avgTransaction: 0,
      largestTransaction: { amount: 0, merchant: "", date: "" },
      spendingBreakdown: [],
      topMerchants: [],
      byCard: [],
      recentTransactions: [],
      dateRange: null,
    };
  }

  const sorted = [...transactions].sort((a, b) => {
    const da = new Date(a.timestamp).getTime();
    const db = new Date(b.timestamp).getTime();
    return isNaN(db - da) ? 0 : db - da;
  });

  const forMerchants = hiddenCategories?.merchants.size
    ? transactions.filter((t) => !t.category || !hiddenCategories!.merchants.has(t.category))
    : transactions;
  const forChart = hiddenCategories?.chart.size
    ? transactions.filter((t) => !t.category || !hiddenCategories!.chart.has(t.category))
    : transactions;
  const forStats = hiddenCategories?.stats.size
    ? transactions.filter((t) => !t.category || !hiddenCategories!.stats.has(t.category))
    : transactions;

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const transactionCount = transactions.length;
  const avgTransaction = forStats.length > 0
    ? forStats.reduce((s, t) => s + t.amount, 0) / forStats.length
    : 0;

  const largest = forStats.length > 0
    ? forStats.reduce((max, t) => (t.amount > max.amount ? t : max), forStats[0])
    : { amount: 0, merchant: "", timestamp: "" };

  const spendingBreakdown = buildSpendingBreakdown(forChart, period, localDate);

  const merchantMap = new Map<string, number>();
  for (const t of forMerchants) {
    const m = t.merchant || "Unknown";
    merchantMap.set(m, (merchantMap.get(m) ?? 0) + t.amount);
  }
  const topMerchants = Array.from(merchantMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([merchant, total]) => ({
      merchant,
      total: Math.round(total * 100) / 100,
    }));

  const cardMap = new Map<string, number>();
  for (const t of transactions) {
    const c = t.card || "Unknown";
    cardMap.set(c, (cardMap.get(c) ?? 0) + t.amount);
  }
  const byCard = Array.from(cardMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([card, total]) => ({
      card,
      total: Math.round(total * 100) / 100,
      pct: Math.round((total / totalSpent) * 100),
    }));

  const dates = transactions
    .map((t) => new Date(t.timestamp))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const dateRange =
    dates.length > 0
      ? {
          from: dates[0].toLocaleDateString("default", {
            month: "short",
            year: "numeric",
          }),
          to: dates[dates.length - 1].toLocaleDateString("default", {
            month: "short",
            year: "numeric",
          }),
        }
      : null;

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    transactionCount,
    avgTransaction: Math.round(avgTransaction * 100) / 100,
    largestTransaction: {
      amount: largest.amount,
      merchant: largest.merchant,
      date: largest.timestamp,
    },
    spendingBreakdown,
    topMerchants,
    byCard,
    recentTransactions: sorted.slice(0, 20),
    dateRange,
  };
}

/** Convenience wrapper: parse sheet data then compute stats. */
export function computeStats(data: SheetData): SpendingStats {
  return computeStatsFromTransactions(parseSheetToTransactions(data));
}
