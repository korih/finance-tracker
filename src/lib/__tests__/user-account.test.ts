import { describe, it, expect, vi } from "vitest";
import {
  getEntryCount,
  assertBelowEntryLimit,
  FREE_ENTRY_LIMIT,
  type UserAccount,
} from "../user-account";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<UserAccount> = {}): UserAccount {
  return {
    user_id: "user-123",
    api_id: "api-abc",
    spreadsheet_id: "sheet-xyz",
    subscription: "free",
    inserted_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Build a minimal D1Database mock whose prepare().bind().first() resolves with `result`.
 * All other methods are stubs.
 */
function makeCountDB(total: number): D1Database {
  return {
    prepare: (_sql: string) => ({
      bind: (..._args: unknown[]) => ({
        first: vi.fn().mockResolvedValue({ total }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({}),
      }),
    }),
    batch: vi.fn().mockResolvedValue([]),
    dump: vi.fn(),
    exec: vi.fn(),
  } as unknown as D1Database;
}

// ─── FREE_ENTRY_LIMIT constant ────────────────────────────────────────────────

describe("FREE_ENTRY_LIMIT", () => {
  it("is 200", () => {
    expect(FREE_ENTRY_LIMIT).toBe(200);
  });
});

// ─── getEntryCount ────────────────────────────────────────────────────────────

describe("getEntryCount", () => {
  it("returns the total from the DB query", async () => {
    const db = makeCountDB(42);
    const count = await getEntryCount(db, "sheet-xyz");
    expect(count).toBe(42);
  });

  it("returns 0 when the DB returns a null row", async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: vi.fn().mockResolvedValue(null),
        }),
      }),
    } as unknown as D1Database;
    const count = await getEntryCount(db, "sheet-xyz");
    expect(count).toBe(0);
  });

  it("returns 0 when total field is undefined", async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: vi.fn().mockResolvedValue({}),
        }),
      }),
    } as unknown as D1Database;
    const count = await getEntryCount(db, "sheet-xyz");
    expect(count).toBe(0);
  });
});

// ─── assertBelowEntryLimit ────────────────────────────────────────────────────

describe("assertBelowEntryLimit", () => {
  describe("premium accounts", () => {
    it("never throws regardless of entry count", async () => {
      const db = makeCountDB(FREE_ENTRY_LIMIT + 10000);
      const account = makeAccount({ subscription: "premium" });
      await expect(assertBelowEntryLimit(db, account)).resolves.toBeUndefined();
    });

    it("does not query the database for premium accounts", async () => {
      const db = makeCountDB(0);
      const querySpy = vi.spyOn(db, "prepare");
      const account = makeAccount({ subscription: "premium" });
      await assertBelowEntryLimit(db, account);
      expect(querySpy).not.toHaveBeenCalled();
    });
  });

  describe("free accounts — below limit", () => {
    it("does not throw when count is 0", async () => {
      const db = makeCountDB(0);
      await expect(assertBelowEntryLimit(db, makeAccount())).resolves.toBeUndefined();
    });

    it("does not throw when count is 1", async () => {
      const db = makeCountDB(1);
      await expect(assertBelowEntryLimit(db, makeAccount())).resolves.toBeUndefined();
    });

    it("does not throw when count is limit - 1", async () => {
      const db = makeCountDB(FREE_ENTRY_LIMIT - 1);
      await expect(assertBelowEntryLimit(db, makeAccount())).resolves.toBeUndefined();
    });
  });

  describe("free accounts — at or above limit", () => {
    it("throws when count equals the free limit", async () => {
      const db = makeCountDB(FREE_ENTRY_LIMIT);
      await expect(assertBelowEntryLimit(db, makeAccount())).rejects.toThrow();
    });

    it("throws when count exceeds the free limit", async () => {
      const db = makeCountDB(FREE_ENTRY_LIMIT + 50);
      await expect(assertBelowEntryLimit(db, makeAccount())).rejects.toThrow();
    });

    it("error message includes the limit number", async () => {
      const db = makeCountDB(FREE_ENTRY_LIMIT);
      await expect(assertBelowEntryLimit(db, makeAccount())).rejects.toThrow(
        String(FREE_ENTRY_LIMIT)
      );
    });

    it("error message mentions upgrading to premium", async () => {
      const db = makeCountDB(FREE_ENTRY_LIMIT);
      await expect(assertBelowEntryLimit(db, makeAccount())).rejects.toThrow(
        /premium/i
      );
    });
  });
});
