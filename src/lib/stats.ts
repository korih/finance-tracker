import type { SheetData } from "./google-sheets";

export interface Transaction {
  timestamp: string;
  merchant: string;
  name: string;
  amount: number;
  card: string;
}

export interface SpendingStats {
  totalSpent: number;
  thisMonthTotal: number;
  avgTransaction: number;
  largestTransaction: { amount: number; merchant: string; date: string };
  monthlyTotals: { month: string; label: string; total: number }[];
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

export function computeStats(data: SheetData): SpendingStats {
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

  if (transactions.length === 0) {
    return {
      totalSpent: 0,
      thisMonthTotal: 0,
      avgTransaction: 0,
      largestTransaction: { amount: 0, merchant: "", date: "" },
      monthlyTotals: [],
      topMerchants: [],
      byCard: [],
      recentTransactions: [],
      dateRange: null,
    };
  }

  // Sort transactions by date descending (newest first)
  const sorted = [...transactions].sort((a, b) => {
    const da = new Date(a.timestamp).getTime();
    const db = new Date(b.timestamp).getTime();
    return isNaN(db - da) ? 0 : db - da;
  });

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const avgTransaction = totalSpent / transactions.length;

  const largest = transactions.reduce(
    (max, t) => (t.amount > max.amount ? t : max),
    transactions[0]
  );

  // This month
  const now = new Date();
  const thisMonthTotal = transactions
    .filter((t) => {
      const d = new Date(t.timestamp);
      return (
        !isNaN(d.getTime()) &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((s, t) => s + t.amount, 0);

  // Monthly totals — last 12 months
  const monthMap = new Map<string, number>();
  for (const t of transactions) {
    const d = new Date(t.timestamp);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + t.amount);
  }

  const allMonthKeys = Array.from(monthMap.keys()).sort();
  const last12 = allMonthKeys.slice(-12);
  const monthlyTotals = last12.map((key) => {
    const [year, month] = key.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return {
      month: key,
      label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      total: Math.round((monthMap.get(key) ?? 0) * 100) / 100,
    };
  });

  // Top merchants
  const merchantMap = new Map<string, number>();
  for (const t of transactions) {
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

  // By card
  const cardMap = new Map<string, number>();
  for (const t of transactions) {
    const c = t.card || "Unknown";
    cardMap.set(c, (cardMap.get(c) ?? 0) + t.amount);
  }
  const cardEntries = Array.from(cardMap.entries()).sort((a, b) => b[1] - a[1]);
  const byCard = cardEntries.map(([card, total]) => ({
    card,
    total: Math.round(total * 100) / 100,
    pct: Math.round((total / totalSpent) * 100),
  }));

  // Date range
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
    thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
    avgTransaction: Math.round(avgTransaction * 100) / 100,
    largestTransaction: {
      amount: largest.amount,
      merchant: largest.merchant,
      date: largest.timestamp,
    },
    monthlyTotals,
    topMerchants,
    byCard,
    recentTransactions: sorted.slice(0, 20),
    dateRange,
  };
}
