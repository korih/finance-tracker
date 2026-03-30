import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  filterTransactionsByPeriod,
  computeStatsFromTransactions,
  type Transaction,
  type Period,
} from "../stats";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    timestamp: "2026-03-15T12:00:00",
    merchant: "Test Merchant",
    name: "",
    amount: 10.0,
    card: "Visa",
    ...overrides,
  };
}

// ─── filterTransactionsByPeriod ───────────────────────────────────────────────

describe("filterTransactionsByPeriod", () => {
  describe("all", () => {
    it("returns every transaction unchanged", () => {
      const txns = [tx({ timestamp: "2020-01-01" }), tx({ timestamp: "2026-03-30" })];
      expect(filterTransactionsByPeriod(txns, "all")).toHaveLength(2);
    });

    it("returns empty array when input is empty", () => {
      expect(filterTransactionsByPeriod([], "all")).toEqual([]);
    });
  });

  describe("day", () => {
    it("includes transactions on the given local date", () => {
      const txns = [
        tx({ timestamp: "2026-03-30T08:00:00" }),
        tx({ timestamp: "2026-03-30T23:59:00" }),
        tx({ timestamp: "2026-03-29T12:00:00" }), // yesterday — excluded
      ];
      const result = filterTransactionsByPeriod(txns, "day", { localDate: "2026-03-30" });
      expect(result).toHaveLength(2);
    });

    it("excludes transactions from other days", () => {
      const txns = [tx({ timestamp: "2026-03-28T12:00:00" })];
      expect(filterTransactionsByPeriod(txns, "day", { localDate: "2026-03-30" })).toHaveLength(0);
    });

    it("excludes transactions from same month but different day", () => {
      const txns = [tx({ timestamp: "2026-03-01T12:00:00" })];
      expect(filterTransactionsByPeriod(txns, "day", { localDate: "2026-03-30" })).toHaveLength(0);
    });
  });

  describe("week", () => {
    // 2026-03-30 is a Monday — so this week is Mon 30 Mar – Sun 5 Apr
    it("includes all days of the current ISO week (Mon–Sun)", () => {
      const txns = [
        tx({ timestamp: "2026-03-30T00:00:01" }), // Monday (start)
        tx({ timestamp: "2026-04-02T12:00:00" }), // Thursday
        tx({ timestamp: "2026-04-05T23:59:59" }), // Sunday (last day)
      ];
      const result = filterTransactionsByPeriod(txns, "week", { localDate: "2026-03-30" });
      expect(result).toHaveLength(3);
    });

    it("excludes transactions from the previous week", () => {
      const txns = [tx({ timestamp: "2026-03-29T23:59:59" })]; // Sunday before
      expect(filterTransactionsByPeriod(txns, "week", { localDate: "2026-03-30" })).toHaveLength(0);
    });

    it("excludes transactions from the following week", () => {
      const txns = [tx({ timestamp: "2026-04-06T00:00:00" })]; // next Monday
      expect(filterTransactionsByPeriod(txns, "week", { localDate: "2026-03-30" })).toHaveLength(0);
    });

    it("handles Sunday as the last day of the current week", () => {
      // When today is Sunday 2026-04-05, week is still Mon 30 Mar – Sun 5 Apr
      const txns = [
        tx({ timestamp: "2026-03-30T12:00:00" }), // Monday
        tx({ timestamp: "2026-04-05T12:00:00" }), // Sunday (today)
      ];
      const result = filterTransactionsByPeriod(txns, "week", { localDate: "2026-04-05" });
      expect(result).toHaveLength(2);
    });
  });

  describe("month", () => {
    it("includes all transactions in the same year-month", () => {
      const txns = [
        tx({ timestamp: "2026-03-01T12:00:00" }),
        tx({ timestamp: "2026-03-31T12:00:00" }),
      ];
      expect(filterTransactionsByPeriod(txns, "month", { localDate: "2026-03-15" })).toHaveLength(2);
    });

    it("excludes transactions from previous month", () => {
      const txns = [tx({ timestamp: "2026-02-28T12:00:00" })];
      expect(filterTransactionsByPeriod(txns, "month", { localDate: "2026-03-15" })).toHaveLength(0);
    });

    it("excludes transactions from next month", () => {
      const txns = [tx({ timestamp: "2026-04-01T12:00:00" })];
      expect(filterTransactionsByPeriod(txns, "month", { localDate: "2026-03-15" })).toHaveLength(0);
    });

    it("excludes transactions from the same month in a different year", () => {
      const txns = [tx({ timestamp: "2025-03-15T12:00:00" })];
      expect(filterTransactionsByPeriod(txns, "month", { localDate: "2026-03-15" })).toHaveLength(0);
    });
  });

  describe("year", () => {
    it("includes all transactions in the current year by default", () => {
      const txns = [
        tx({ timestamp: "2026-01-01T12:00:00" }),
        tx({ timestamp: "2026-12-31T12:00:00" }),
      ];
      expect(filterTransactionsByPeriod(txns, "year", { localDate: "2026-03-30" })).toHaveLength(2);
    });

    it("respects the explicit year option", () => {
      const txns = [
        tx({ timestamp: "2025-06-15T12:00:00" }),
        tx({ timestamp: "2026-06-15T12:00:00" }), // excluded — not 2025
      ];
      const result = filterTransactionsByPeriod(txns, "year", { year: 2025 });
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toContain("2025");
    });

    it("excludes transactions from different years", () => {
      const txns = [tx({ timestamp: "2025-03-15T12:00:00" })];
      expect(filterTransactionsByPeriod(txns, "year", { localDate: "2026-03-30" })).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("silently filters out transactions with invalid timestamps", () => {
      const txns = [
        tx({ timestamp: "not-a-date" }),
        tx({ timestamp: "2026-03-30T12:00:00" }),
      ];
      const result = filterTransactionsByPeriod(txns, "day", { localDate: "2026-03-30" });
      expect(result).toHaveLength(1);
    });

    it("handles YYYY-MM-DD date strings (no time component)", () => {
      const txns = [tx({ timestamp: "2026-03-30" })];
      // "2026-03-30" parses as UTC midnight; with localDate it still checks local date fields
      // The function uses new Date(t.timestamp) and d.getDate() etc. which are LOCAL
      // This is the expected behaviour: plain date strings parse as local midnight (not UTC)
      const result = filterTransactionsByPeriod(txns, "month", { localDate: "2026-03-15" });
      expect(result).toHaveLength(1);
    });
  });
});

// ─── computeStatsFromTransactions ────────────────────────────────────────────

describe("computeStatsFromTransactions", () => {
  describe("empty input", () => {
    it("returns zero stats when given no transactions", () => {
      const stats = computeStatsFromTransactions([]);
      expect(stats.totalSpent).toBe(0);
      expect(stats.transactionCount).toBe(0);
      expect(stats.avgTransaction).toBe(0);
      expect(stats.largestTransaction).toEqual({ amount: 0, merchant: "", date: "" });
      expect(stats.spendingBreakdown).toEqual([]);
      expect(stats.topMerchants).toEqual([]);
      expect(stats.byCard).toEqual([]);
      expect(stats.recentTransactions).toEqual([]);
      expect(stats.dateRange).toBeNull();
    });
  });

  describe("totals and counts", () => {
    it("sums totalSpent across all transactions", () => {
      const txns = [tx({ amount: 10 }), tx({ amount: 20 }), tx({ amount: 5 })];
      expect(computeStatsFromTransactions(txns).totalSpent).toBe(35);
    });

    it("rounds totalSpent to 2 decimal places", () => {
      const txns = [tx({ amount: 0.1 }), tx({ amount: 0.2 })];
      expect(computeStatsFromTransactions(txns).totalSpent).toBe(0.3);
    });

    it("counts all transactions regardless of hidden categories", () => {
      const txns = [
        tx({ amount: 10, category: "Food" }),
        tx({ amount: 20, category: "Hidden" }),
      ];
      const stats = computeStatsFromTransactions(txns, "all", undefined, {
        merchants: new Set(["Hidden"]),
        chart: new Set(["Hidden"]),
        stats: new Set(["Hidden"]),
      });
      expect(stats.transactionCount).toBe(2);
    });

    it("totalSpent always includes hidden-stat-category transactions", () => {
      const txns = [
        tx({ amount: 100, category: "Hidden" }),
        tx({ amount: 50 }),
      ];
      const stats = computeStatsFromTransactions(txns, "all", undefined, {
        merchants: new Set(),
        chart: new Set(),
        stats: new Set(["Hidden"]),
      });
      expect(stats.totalSpent).toBe(150);
    });
  });

  describe("average transaction", () => {
    it("calculates average over all transactions when no hidden categories", () => {
      const txns = [tx({ amount: 10 }), tx({ amount: 20 }), tx({ amount: 30 })];
      expect(computeStatsFromTransactions(txns).avgTransaction).toBe(20);
    });

    it("excludes hidden-stats-category transactions from the average", () => {
      const txns = [
        tx({ amount: 10 }),
        tx({ amount: 20 }),
        tx({ amount: 1000, category: "HideStat" }), // excluded from avg
      ];
      const stats = computeStatsFromTransactions(txns, "all", undefined, {
        merchants: new Set(),
        chart: new Set(),
        stats: new Set(["HideStat"]),
      });
      expect(stats.avgTransaction).toBe(15);
    });

    it("returns 0 average when all transactions are in hidden-stats categories", () => {
      const txns = [tx({ amount: 100, category: "HideStat" })];
      const stats = computeStatsFromTransactions(txns, "all", undefined, {
        merchants: new Set(),
        chart: new Set(),
        stats: new Set(["HideStat"]),
      });
      expect(stats.avgTransaction).toBe(0);
    });

    it("rounds average to 2 decimal places", () => {
      const txns = [tx({ amount: 10 }), tx({ amount: 20 }), tx({ amount: 5 })];
      const stats = computeStatsFromTransactions(txns);
      expect(stats.avgTransaction).toBe(11.67);
    });
  });

  describe("largest transaction", () => {
    it("finds the transaction with the largest amount", () => {
      const txns = [
        tx({ amount: 10, merchant: "Small" }),
        tx({ amount: 999, merchant: "Big" }),
        tx({ amount: 50, merchant: "Medium" }),
      ];
      expect(computeStatsFromTransactions(txns).largestTransaction.merchant).toBe("Big");
      expect(computeStatsFromTransactions(txns).largestTransaction.amount).toBe(999);
    });

    it("excludes hidden-stats transactions from largest calculation", () => {
      const txns = [
        tx({ amount: 999, merchant: "Hidden", category: "HideStat" }),
        tx({ amount: 100, merchant: "Visible" }),
      ];
      const stats = computeStatsFromTransactions(txns, "all", undefined, {
        merchants: new Set(),
        chart: new Set(),
        stats: new Set(["HideStat"]),
      });
      expect(stats.largestTransaction.merchant).toBe("Visible");
    });
  });

  describe("top merchants", () => {
    it("aggregates and sorts merchants by total spend descending", () => {
      const txns = [
        tx({ merchant: "B", amount: 20 }),
        tx({ merchant: "A", amount: 50 }),
        tx({ merchant: "B", amount: 30 }), // B total = 50
      ];
      const { topMerchants } = computeStatsFromTransactions(txns);
      // A=50, B=50 — B appears first when tied (Map insertion order), then A
      expect(topMerchants[0].total).toBeGreaterThanOrEqual(topMerchants[1].total);
    });

    it("limits to 8 merchants", () => {
      const txns = Array.from({ length: 10 }, (_, i) =>
        tx({ merchant: `Merchant${i}`, amount: i + 1 })
      );
      expect(computeStatsFromTransactions(txns).topMerchants).toHaveLength(8);
    });

    it("excludes hidden-merchant-category transactions from top merchants", () => {
      const txns = [
        tx({ merchant: "Hidden", amount: 9999, category: "HideMerchant" }),
        tx({ merchant: "Visible", amount: 1 }),
      ];
      const stats = computeStatsFromTransactions(txns, "all", undefined, {
        merchants: new Set(["HideMerchant"]),
        chart: new Set(),
        stats: new Set(),
      });
      expect(stats.topMerchants).toHaveLength(1);
      expect(stats.topMerchants[0].merchant).toBe("Visible");
    });

    it("uses Unknown for blank merchant names", () => {
      const txns = [tx({ merchant: "", amount: 10 })];
      const { topMerchants } = computeStatsFromTransactions(txns);
      expect(topMerchants[0].merchant).toBe("Unknown");
    });
  });

  describe("by card breakdown", () => {
    it("aggregates spend by card", () => {
      const txns = [
        tx({ card: "Visa", amount: 60 }),
        tx({ card: "Amex", amount: 40 }),
      ];
      const { byCard } = computeStatsFromTransactions(txns);
      expect(byCard).toHaveLength(2);
      expect(byCard[0].card).toBe("Visa");
      expect(byCard[0].total).toBe(60);
      expect(byCard[0].pct).toBe(60);
      expect(byCard[1].pct).toBe(40);
    });

    it("always uses ALL transactions for byCard (ignores hidden categories)", () => {
      const txns = [
        tx({ card: "Visa", amount: 100, category: "HideStat" }),
        tx({ card: "Amex", amount: 100 }),
      ];
      const stats = computeStatsFromTransactions(txns, "all", undefined, {
        merchants: new Set(["HideStat"]),
        chart: new Set(["HideStat"]),
        stats: new Set(["HideStat"]),
      });
      expect(stats.byCard).toHaveLength(2);
    });

    it("uses Unknown for blank card names", () => {
      const txns = [tx({ card: "", amount: 10 })];
      expect(computeStatsFromTransactions(txns).byCard[0].card).toBe("Unknown");
    });
  });

  describe("recent transactions", () => {
    it("returns transactions sorted newest-first", () => {
      const txns = [
        tx({ timestamp: "2026-01-01T12:00:00" }),
        tx({ timestamp: "2026-03-30T12:00:00" }),
        tx({ timestamp: "2026-02-15T12:00:00" }),
      ];
      const { recentTransactions } = computeStatsFromTransactions(txns);
      expect(recentTransactions[0].timestamp).toContain("2026-03-30");
      expect(recentTransactions[2].timestamp).toContain("2026-01-01");
    });

    it("caps at 20 recent transactions", () => {
      const txns = Array.from({ length: 30 }, (_, i) =>
        tx({ timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T12:00:00` })
      );
      expect(computeStatsFromTransactions(txns).recentTransactions).toHaveLength(20);
    });
  });

  describe("date range", () => {
    it("computes from/to date range across all transactions", () => {
      const txns = [
        tx({ timestamp: "2026-03-30T12:00:00" }),
        tx({ timestamp: "2025-01-15T12:00:00" }),
        tx({ timestamp: "2026-01-01T12:00:00" }),
      ];
      const { dateRange } = computeStatsFromTransactions(txns);
      expect(dateRange).not.toBeNull();
      // "from" is the earliest, "to" is the latest
      expect(dateRange!.from).toContain("2025");
      expect(dateRange!.to).toContain("2026");
    });

    it("returns null dateRange for empty input", () => {
      expect(computeStatsFromTransactions([]).dateRange).toBeNull();
    });
  });

  describe("spending breakdown", () => {
    it("builds year buckets for 'all' period", () => {
      const txns = [
        tx({ timestamp: "2024-06-01T12:00:00", amount: 100 }),
        tx({ timestamp: "2025-06-01T12:00:00", amount: 200 }),
      ];
      const { spendingBreakdown } = computeStatsFromTransactions(txns, "all", "2026-03-30");
      const keys = spendingBreakdown.map((e) => e.key);
      expect(keys).toContain("2024");
      expect(keys).toContain("2025");
    });

    it("marks the current year bucket as isCurrent", () => {
      const txns = [
        tx({ timestamp: "2025-01-01T12:00:00" }),
        tx({ timestamp: "2026-03-01T12:00:00" }),
      ];
      const { spendingBreakdown } = computeStatsFromTransactions(txns, "all", "2026-03-30");
      const currentBucket = spendingBreakdown.find((e) => e.isCurrent);
      expect(currentBucket?.key).toBe("2026");
    });

    it("excludes hidden-chart-category transactions from breakdown", () => {
      const txns = [
        tx({ timestamp: "2026-03-01T12:00:00", amount: 9999, category: "HideChart" }),
        tx({ timestamp: "2026-03-15T12:00:00", amount: 50 }),
      ];
      const stats = computeStatsFromTransactions(txns, "month", "2026-03-30", {
        merchants: new Set(),
        chart: new Set(["HideChart"]),
        stats: new Set(),
      });
      // The breakdown for March should only reflect the non-hidden transaction
      const marchEntry = stats.spendingBreakdown.find((e) => e.key.startsWith("2026-03"));
      // month period builds weekly buckets, so just confirm hidden amount is excluded
      const totalInBreakdown = stats.spendingBreakdown.reduce((s, e) => s + e.total, 0);
      expect(totalInBreakdown).toBeLessThan(9999 + 50);
      expect(totalInBreakdown).toBe(50);
    });

    it("zero-fills all 7 days for week period", () => {
      const txns = [tx({ timestamp: "2026-03-30T12:00:00", amount: 10 })];
      const { spendingBreakdown } = computeStatsFromTransactions(txns, "week", "2026-03-30");
      expect(spendingBreakdown).toHaveLength(7);
      const emptyDays = spendingBreakdown.filter((e) => e.total === 0);
      expect(emptyDays.length).toBe(6);
    });
  });
});
