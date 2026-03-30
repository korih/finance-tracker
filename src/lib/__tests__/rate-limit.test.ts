import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "../rate-limit";

// ─── Mock KV ─────────────────────────────────────────────────────────────────

function createMockKV(initialCount: string | null = null) {
  const store = new Map<string, string>();
  if (initialCount !== null) {
    // Pre-populate with the given count (key doesn't matter — any get returns it)
    store.set("__any__", initialCount);
  }
  return {
    get: vi.fn(async (_key: string) => store.get(_key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  } as unknown as KVNamespace;
}

/** Build a KV that always returns `count` for any get() */
function kvWithCount(count: number): KVNamespace {
  return {
    get: vi.fn().mockResolvedValue(String(count)),
    put: vi.fn().mockResolvedValue(undefined),
  } as unknown as KVNamespace;
}

/** Build a KV that returns null (key not found) */
function emptyKV(): KVNamespace {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
  } as unknown as KVNamespace;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("rateLimit", () => {
  // Fix time to a clean hour boundary: 2026-03-30T12:00:00Z = 1774958400s
  const FIXED_UNIX = 1774958400;
  const WINDOW_SECS = 3600;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_UNIX * 1000));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const opts = { limit: 60, windowSecs: WINDOW_SECS };

  describe("first request in a window", () => {
    it("is allowed when the KV key does not exist", async () => {
      const kv = emptyKV();
      const result = await rateLimit(kv, "api:abc", opts);
      expect(result.allowed).toBe(true);
    });

    it("returns remaining = limit - 1", async () => {
      const kv = emptyKV();
      const result = await rateLimit(kv, "api:abc", opts);
      expect(result.remaining).toBe(59);
    });

    it("stores count of 1 in KV", async () => {
      const kv = emptyKV();
      await rateLimit(kv, "api:abc", opts);
      expect(kv.put).toHaveBeenCalledWith(
        expect.any(String),
        "1",
        { expirationTtl: WINDOW_SECS + 10 }
      );
    });
  });

  describe("subsequent requests within the same window", () => {
    it("is allowed when count < limit", async () => {
      const kv = kvWithCount(30);
      const result = await rateLimit(kv, "api:abc", opts);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });

    it("is allowed on the last allowed request (count = limit - 1)", async () => {
      const kv = kvWithCount(59); // 59 requests already used
      const result = await rateLimit(kv, "api:abc", opts);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });

  describe("rate limit exceeded", () => {
    it("is denied when count equals the limit", async () => {
      const kv = kvWithCount(60);
      const result = await rateLimit(kv, "api:abc", opts);
      expect(result.allowed).toBe(false);
    });

    it("is denied when count exceeds the limit", async () => {
      const kv = kvWithCount(100);
      const result = await rateLimit(kv, "api:abc", opts);
      expect(result.allowed).toBe(false);
    });

    it("returns remaining = 0 when denied", async () => {
      const kv = kvWithCount(60);
      const result = await rateLimit(kv, "api:abc", opts);
      expect(result.remaining).toBe(0);
    });

    it("does NOT call kv.put when denied (no wasted write)", async () => {
      const kv = kvWithCount(60);
      await rateLimit(kv, "api:abc", opts);
      expect(kv.put).not.toHaveBeenCalled();
    });
  });

  describe("window boundaries", () => {
    it("returns correct resetAt (window start + windowSecs)", async () => {
      const kv = emptyKV();
      const result = await rateLimit(kv, "api:abc", opts);
      // windowStart = FIXED_UNIX - (FIXED_UNIX % WINDOW_SECS) = FIXED_UNIX (on boundary)
      expect(result.resetAt).toBe(FIXED_UNIX + WINDOW_SECS);
    });

    it("uses a window-aligned key (key:windowStart)", async () => {
      const kv = emptyKV();
      await rateLimit(kv, "my-key", opts);
      const expectedKey = `my-key:${FIXED_UNIX}`;
      expect(kv.get).toHaveBeenCalledWith(expectedKey);
      expect(kv.put).toHaveBeenCalledWith(expectedKey, "1", expect.any(Object));
    });

    it("mid-window: windowStart is floored to the start of the current hour", async () => {
      // Move time forward 30 minutes into the window
      vi.setSystemTime(new Date((FIXED_UNIX + 1800) * 1000));
      const kv = emptyKV();
      const result = await rateLimit(kv, "api:abc", opts);
      // resetAt should still be end of original window
      expect(result.resetAt).toBe(FIXED_UNIX + WINDOW_SECS);
    });

    it("different windows produce different KV keys", async () => {
      const kv = emptyKV();
      await rateLimit(kv, "api:abc", opts);
      const callsWindow1 = (kv.get as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Advance to next window
      vi.setSystemTime(new Date((FIXED_UNIX + WINDOW_SECS) * 1000));
      const kv2 = emptyKV();
      await rateLimit(kv2, "api:abc", opts);
      const callsWindow2 = (kv2.get as ReturnType<typeof vi.fn>).mock.calls[0][0];

      expect(callsWindow1).not.toBe(callsWindow2);
    });
  });

  describe("KV expiry TTL", () => {
    it("sets TTL to windowSecs + 10 seconds buffer", async () => {
      const kv = emptyKV();
      await rateLimit(kv, "api:abc", opts);
      expect(kv.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { expirationTtl: WINDOW_SECS + 10 }
      );
    });
  });

  describe("custom limits and windows", () => {
    it("respects a custom limit", async () => {
      const kv = kvWithCount(10);
      const result = await rateLimit(kv, "api:x", { limit: 10, windowSecs: 60 });
      expect(result.allowed).toBe(false);
    });

    it("respects a custom window", async () => {
      // 1-minute window
      const customSecs = 60;
      const kv = emptyKV();
      const result = await rateLimit(kv, "api:x", { limit: 5, windowSecs: customSecs });
      expect(result.resetAt).toBe(FIXED_UNIX + customSecs);
    });
  });
});
