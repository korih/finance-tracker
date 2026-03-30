import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processRecurringRules, type RecurringRule } from "../recurring";

// ─── Mock D1 builder ──────────────────────────────────────────────────────────

interface CapturedStatement {
  sql: string;
  args: unknown[];
}

function createMockDB(dueRules: RecurringRule[]) {
  const captured: CapturedStatement[] = [];

  const makeStmt = (sql: string, args: unknown[]) => ({
    sql,
    args,
    // first() is not used in processRecurringRules, but included for completeness
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({
      results: sql.includes("next_due_date <=") ? dueRules : [],
    }),
    run: vi.fn().mockResolvedValue({}),
  });

  const db = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => makeStmt(sql, args),
    }),
    batch: vi.fn(async (stmts: CapturedStatement[]) => {
      captured.push(...stmts);
    }),
    _captured: captured,
  };

  return db as unknown as D1Database & { _captured: CapturedStatement[] };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: 1,
    spreadsheet_id: "sheet-1",
    entry_type: "expense",
    merchant: "Netflix",
    card: "Visa",
    income_source: null,
    income_type: null,
    amount: 15.99,
    recurrence_type: "monthly",
    recurrence_days: null,
    start_date: "2026-03-01",
    last_generated_date: null,
    next_due_date: "2026-03-01",
    inserted_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("processRecurringRules", () => {
  // System date fixed to Monday 2026-03-30
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T12:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("no due rules", () => {
    it("does nothing when there are no due rules", async () => {
      const db = createMockDB([]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      expect(db.batch).not.toHaveBeenCalled();
    });
  });

  describe("daily recurrence", () => {
    it("generates one entry when start_date equals today and no prior generation", async () => {
      const rule = makeRule({
        recurrence_type: "daily",
        start_date: "2026-03-30",
        next_due_date: "2026-03-30",
        last_generated_date: null,
      });
      const db = createMockDB([rule]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      expect(db.batch).toHaveBeenCalled();
      const stmts = db._captured;
      // 1 INSERT for today + 1 UPDATE for rule metadata
      expect(stmts).toHaveLength(2);
    });

    it("generates multiple entries when start_date is in the past", async () => {
      // Today = 2026-03-30; daily rule started 2026-03-28
      const rule = makeRule({
        recurrence_type: "daily",
        start_date: "2026-03-28",
        next_due_date: "2026-03-28",
        last_generated_date: null,
      });
      const db = createMockDB([rule]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      // 3 dates (28, 29, 30) + 1 UPDATE = 4 stmts
      expect(db._captured).toHaveLength(4);
    });

    it("resumes from the day after last_generated_date", async () => {
      // Last generated was 2026-03-28; next should be 2026-03-29 and 2026-03-30
      const rule = makeRule({
        recurrence_type: "daily",
        start_date: "2026-03-01",
        next_due_date: "2026-03-29",
        last_generated_date: "2026-03-28",
      });
      const db = createMockDB([rule]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      // 2 INSERTs (29, 30) + 1 UPDATE = 3 stmts
      expect(db._captured).toHaveLength(3);
    });
  });

  describe("weekly recurrence", () => {
    it("generates one entry for this week and updates next_due to +7 days", async () => {
      const rule = makeRule({
        recurrence_type: "weekly",
        start_date: "2026-03-30",
        next_due_date: "2026-03-30",
        last_generated_date: null,
      });
      const db = createMockDB([rule]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      // 1 INSERT + 1 UPDATE
      expect(db._captured).toHaveLength(2);
    });

    it("generates multiple entries if multiple weeks are overdue", async () => {
      // 3 weeks overdue: 2026-03-09, 2026-03-16, 2026-03-23, 2026-03-30
      const rule = makeRule({
        recurrence_type: "weekly",
        start_date: "2026-03-09",
        next_due_date: "2026-03-09",
        last_generated_date: null,
      });
      const db = createMockDB([rule]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      // 4 INSERTs + 1 UPDATE = 5
      expect(db._captured).toHaveLength(5);
    });
  });

  describe("monthly recurrence", () => {
    it("generates an entry when monthly due date is today", async () => {
      const rule = makeRule({
        recurrence_type: "monthly",
        start_date: "2026-03-30",
        next_due_date: "2026-03-30",
        last_generated_date: null,
      });
      const db = createMockDB([rule]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      expect(db._captured).toHaveLength(2); // 1 INSERT + 1 UPDATE
    });

    it("skips if next_due_date is tomorrow (not yet due)", async () => {
      // The DB query filters WHERE next_due_date <= today — tomorrow won't appear
      // Simulate by passing an empty rules array (DB would return nothing)
      const db = createMockDB([]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      expect(db.batch).not.toHaveBeenCalled();
    });
  });

  describe("custom interval recurrence", () => {
    it("advances by recurrence_days for custom rules", async () => {
      // 14-day custom rule, started 2 intervals ago
      const rule = makeRule({
        recurrence_type: "custom",
        recurrence_days: 14,
        start_date: "2026-03-02",
        next_due_date: "2026-03-02",
        last_generated_date: null,
      });
      const db = createMockDB([rule]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      // 2026-03-02 and 2026-03-16 are both <= 2026-03-30; 2026-03-30 is <= too → 3 entries
      expect(db._captured).toHaveLength(4); // 3 INSERTs + 1 UPDATE
    });
  });

  describe("income rules", () => {
    it("generates income_entries INSERT for income-type rules", async () => {
      const rule = makeRule({
        entry_type: "income",
        merchant: null,
        card: null,
        income_source: "Salary",
        income_type: "income",
        recurrence_type: "monthly",
        start_date: "2026-03-01",
        next_due_date: "2026-03-01",
        last_generated_date: null,
      });
      const db = createMockDB([rule]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      // Verify that at least one statement targets income_entries
      const insertStmt = db._captured.find(
        (s) => s.sql.includes("income_entries")
      );
      expect(insertStmt).toBeDefined();
    });
  });

  describe("rule metadata update", () => {
    it("includes an UPDATE for last_generated_date and next_due_date", async () => {
      const rule = makeRule({
        recurrence_type: "daily",
        start_date: "2026-03-30",
        next_due_date: "2026-03-30",
        last_generated_date: null,
      });
      const db = createMockDB([rule]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      const update = db._captured.find((s) =>
        s.sql.includes("last_generated_date")
      );
      expect(update).toBeDefined();
      // last_generated = today, next_due = tomorrow
      expect(update!.args[0]).toBe("2026-03-30");
      expect(update!.args[1]).toBe("2026-03-31");
    });

    it("sets next_due_date to the day AFTER the last generated date", async () => {
      const rule = makeRule({
        recurrence_type: "weekly",
        start_date: "2026-03-30",
        next_due_date: "2026-03-30",
        last_generated_date: null,
      });
      const db = createMockDB([rule]);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      const update = db._captured.find((s) =>
        s.sql.includes("last_generated_date")
      );
      expect(update!.args[0]).toBe("2026-03-30"); // last
      expect(update!.args[1]).toBe("2026-04-06"); // next (+7 days)
    });
  });

  describe("multiple concurrent rules", () => {
    it("processes all due rules in a single batch", async () => {
      const rules = [
        makeRule({ id: 1, recurrence_type: "daily", start_date: "2026-03-30", next_due_date: "2026-03-30" }),
        makeRule({ id: 2, recurrence_type: "monthly", start_date: "2026-03-30", next_due_date: "2026-03-30", merchant: "Spotify" }),
      ];
      const db = createMockDB(rules);
      await processRecurringRules(db as unknown as D1Database, "sheet-1");
      // Each rule generates 1 INSERT + 1 UPDATE = 2 stmts each → 4 total
      expect(db._captured).toHaveLength(4);
      expect(db.batch).toHaveBeenCalledTimes(1);
    });
  });
});
