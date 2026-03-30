import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeIncomeStats, type IncomeEntry, type IncomePeriod } from "../income";

// income.ts has a top-level import of @opennextjs/cloudflare; mock it so the
// module loads cleanly in Node without a Cloudflare runtime.
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

let idSeq = 1;
function makeEntry(overrides: Partial<IncomeEntry> = {}): IncomeEntry {
  return {
    id: idSeq++,
    spreadsheet_id: "sheet-1",
    source: "Salary",
    type: "income",
    amount: 1000,
    date: "2026-03-15",
    recurring_rule_id: null,
    inserted_at: "2026-03-15T12:00:00Z",
    category: null,
    ...overrides,
  };
}

// ─── computeIncomeStats ───────────────────────────────────────────────────────

describe("computeIncomeStats", () => {
  // Fix system time so "current year" and "current month" tests are deterministic
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    idSeq = 1;
  });

  describe("empty entries", () => {
    it("returns zero stats for year period", () => {
      const stats = computeIncomeStats([], "year");
      expect(stats.totalIncome).toBe(0);
      expect(stats.entryCount).toBe(0);
      expect(stats.avgAmount).toBe(0);
      expect(stats.largestEntry).toEqual({ amount: 0, source: "" });
      expect(stats.byType).toEqual([]);
    });

    it("returns avgLabel '/ month' for year period", () => {
      expect(computeIncomeStats([], "year").avgLabel).toBe("/ month");
    });

    it("returns avgLabel '/ year' for all period", () => {
      expect(computeIncomeStats([], "all").avgLabel).toBe("/ year");
    });

    it("year period empty stats has 3 months in breakdown (Jan–Mar, current year 2026)", () => {
      const stats = computeIncomeStats([], "year");
      // Jan, Feb, Mar = 3 months up to March (month 3)
      expect(stats.breakdown).toHaveLength(3);
    });

    it("all period empty stats has empty breakdown", () => {
      expect(computeIncomeStats([], "all").breakdown).toEqual([]);
    });
  });

  describe("totals and counts", () => {
    it("sums totalIncome correctly", () => {
      const entries = [makeEntry({ amount: 1000 }), makeEntry({ amount: 500 })];
      expect(computeIncomeStats(entries, "year").totalIncome).toBe(1500);
    });

    it("rounds totalIncome to 2 decimal places", () => {
      const entries = [makeEntry({ amount: 0.1 }), makeEntry({ amount: 0.2 })];
      expect(computeIncomeStats(entries, "year").totalIncome).toBe(0.3);
    });

    it("counts entries correctly", () => {
      const entries = [makeEntry(), makeEntry(), makeEntry()];
      expect(computeIncomeStats(entries, "year").entryCount).toBe(3);
    });

    it("identifies the largest entry", () => {
      const entries = [
        makeEntry({ source: "Freelance", amount: 500 }),
        makeEntry({ source: "Salary", amount: 5000 }),
        makeEntry({ source: "Interest", amount: 50 }),
      ];
      const stats = computeIncomeStats(entries, "year");
      expect(stats.largestEntry.source).toBe("Salary");
      expect(stats.largestEntry.amount).toBe(5000);
    });
  });

  describe("average calculation", () => {
    it("year period divides by months elapsed in the current year (March = 3)", () => {
      // Jan–Mar = 3 months elapsed
      const entries = [makeEntry({ amount: 3000, date: "2026-01-15" })];
      const stats = computeIncomeStats(entries, "year", 2026);
      expect(stats.avgAmount).toBe(1000); // 3000 / 3
    });

    it("year period for a past year divides by 12", () => {
      vi.setSystemTime(new Date("2026-03-30T12:00:00Z")); // still 2026
      const entries = [makeEntry({ amount: 12000, date: "2025-06-15" })];
      const stats = computeIncomeStats(entries, "year", 2025);
      expect(stats.avgAmount).toBe(1000); // 12000 / 12
    });

    it("all period divides by years spanned", () => {
      const entries = [
        makeEntry({ amount: 10000, date: "2024-06-15" }),
        makeEntry({ amount: 10000, date: "2025-06-15" }),
        makeEntry({ amount: 10000, date: "2026-06-15" }), // mid-year: unambiguous in all timezones
      ];
      // years spanned = 2024..2026 = 3 years; total = 30000
      const stats = computeIncomeStats(entries, "all");
      expect(stats.avgAmount).toBe(10000); // 30000 / 3
    });

    it("all period with single year divides by 1 (not 0)", () => {
      const entries = [makeEntry({ amount: 6000, date: "2026-01-01" })];
      const stats = computeIncomeStats(entries, "all");
      expect(stats.avgAmount).toBe(6000);
    });
  });

  describe("byType distribution", () => {
    it("groups entries by type with totals and percentages", () => {
      const entries = [
        makeEntry({ type: "income", amount: 8000 }),
        makeEntry({ type: "income", amount: 2000 }),
        makeEntry({ type: "interest", amount: 500 }),
        makeEntry({ type: "other", amount: 500 }),
      ];
      const stats = computeIncomeStats(entries, "year");
      const incomeEntry = stats.byType.find((t) => t.type === "income")!;
      const interestEntry = stats.byType.find((t) => t.type === "interest")!;
      expect(incomeEntry.total).toBe(10000);
      expect(incomeEntry.pct).toBe(91); // 10000/11000 * 100 ≈ 90.9 → 91
      expect(interestEntry.total).toBe(500);
    });

    it("sorts byType by total descending", () => {
      const entries = [
        makeEntry({ type: "interest", amount: 100 }),
        makeEntry({ type: "income", amount: 5000 }),
      ];
      const stats = computeIncomeStats(entries, "year");
      expect(stats.byType[0].type).toBe("income");
    });

    it("uses human-readable labels for known types", () => {
      const entries = [
        makeEntry({ type: "income" }),
        makeEntry({ type: "interest" }),
        makeEntry({ type: "other" }),
      ];
      const stats = computeIncomeStats(entries, "year");
      const labels = stats.byType.map((t) => t.label);
      expect(labels).toContain("Income");
      expect(labels).toContain("Interest");
      expect(labels).toContain("Other");
    });
  });

  describe("year breakdown", () => {
    it("includes months from January up to the current month", () => {
      // System time: 2026-03-30 → current month is March (3)
      const stats = computeIncomeStats([], "year", 2026);
      expect(stats.breakdown).toHaveLength(3); // Jan, Feb, Mar
    });

    it("includes all 12 months for a past year", () => {
      const stats = computeIncomeStats([], "year", 2025);
      expect(stats.breakdown).toHaveLength(12);
    });

    it("sums entries into their correct month bucket", () => {
      const entries = [
        makeEntry({ date: "2026-01-05", amount: 1000 }),
        makeEntry({ date: "2026-01-20", amount: 500 }),
        makeEntry({ date: "2026-02-10", amount: 2000 }),
      ];
      const stats = computeIncomeStats(entries, "year", 2026);
      const jan = stats.breakdown.find((b) => b.key === "2026-01")!;
      const feb = stats.breakdown.find((b) => b.key === "2026-02")!;
      const mar = stats.breakdown.find((b) => b.key === "2026-03")!;
      expect(jan.total).toBe(1500);
      expect(feb.total).toBe(2000);
      expect(mar.total).toBe(0);
    });

    it("marks the current month as isCurrent", () => {
      const entries = [
        makeEntry({ date: "2026-01-01" }),
        makeEntry({ date: "2026-03-01" }), // March = current
      ];
      const stats = computeIncomeStats(entries, "year", 2026);
      const current = stats.breakdown.find((b) => b.isCurrent);
      expect(current?.key).toBe("2026-03");
    });

    it("does not include entries outside the year", () => {
      const entries = [
        makeEntry({ date: "2025-12-31", amount: 9999 }),
        makeEntry({ date: "2026-01-01", amount: 100 }),
      ];
      const stats = computeIncomeStats(entries, "year", 2026);
      const total = stats.breakdown.reduce((s, b) => s + b.total, 0);
      expect(total).toBe(100);
    });
  });

  describe("all-time breakdown", () => {
    it("groups entries by year", () => {
      const entries = [
        makeEntry({ date: "2024-06-01", amount: 10000 }),
        makeEntry({ date: "2025-03-01", amount: 20000 }),
        makeEntry({ date: "2026-01-01", amount: 5000 }),
      ];
      const stats = computeIncomeStats(entries, "all");
      expect(stats.breakdown).toHaveLength(3);
      expect(stats.breakdown.find((b) => b.key === "2024")?.total).toBe(10000);
      expect(stats.breakdown.find((b) => b.key === "2025")?.total).toBe(20000);
    });

    it("marks the current year as isCurrent", () => {
      const entries = [
        makeEntry({ date: "2025-01-01" }),
        makeEntry({ date: "2026-01-01" }),
      ];
      const stats = computeIncomeStats(entries, "all");
      const current = stats.breakdown.find((b) => b.isCurrent);
      expect(current?.key).toBe("2026");
    });

    it("does not zero-fill missing years", () => {
      const entries = [
        makeEntry({ date: "2022-01-01" }),
        makeEntry({ date: "2026-01-01" }), // gap years 2023–2025 not included
      ];
      const stats = computeIncomeStats(entries, "all");
      expect(stats.breakdown).toHaveLength(2);
    });
  });
});
