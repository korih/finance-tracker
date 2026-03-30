import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock all external dependencies before importing the route
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDB: vi.fn(),
}));
vi.mock("@/lib/user-account", () => ({
  getUserAccountByApiId: vi.fn(),
  assertBelowEntryLimit: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "@/lib/db";
import { getUserAccountByApiId, assertBelowEntryLimit } from "@/lib/user-account";
import { rateLimit } from "@/lib/rate-limit";
import { GET } from "../route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_ACCOUNT = {
  user_id: "user-123",
  api_id: "valid-api-id",
  spreadsheet_id: "sheet-xyz",
  subscription: "free" as const,
  inserted_at: "2026-01-01T00:00:00Z",
};

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/ingest");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function makeMockDB() {
  return {
    prepare: (_sql: string) => ({
      bind: (..._args: unknown[]) => ({
        run: vi.fn().mockResolvedValue({}),
      }),
    }),
  } as unknown as import("@/lib/db").D1Database;
}

// ─── Setup defaults ───────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(getCloudflareContext).mockResolvedValue({
    env: { RATE_LIMIT_KV: {} },
    ctx: {} as ExecutionContext,
    cf: {} as CfProperties,
  } as Awaited<ReturnType<typeof getCloudflareContext>>);

  vi.mocked(getDB).mockResolvedValue(makeMockDB());

  vi.mocked(getUserAccountByApiId).mockResolvedValue(MOCK_ACCOUNT);

  vi.mocked(assertBelowEntryLimit).mockResolvedValue(undefined);

  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    remaining: 59,
    resetAt: 9999999999,
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/ingest", () => {
  describe("parameter validation", () => {
    it("returns 400 when id is missing", async () => {
      const req = makeRequest({ merchant: "Walmart", amount: "25.50" });
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/id/i);
    });

    it("returns 400 when merchant is missing", async () => {
      const req = makeRequest({ id: "valid-api-id", amount: "25.50" });
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when amount is missing", async () => {
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart" });
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when amount is not a number", async () => {
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "abc" });
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/amount/i);
    });

    it("returns 400 when amount is zero", async () => {
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "0" });
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when amount is negative", async () => {
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "-10" });
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });

  describe("authentication", () => {
    it("returns 401 when the API ID is not found", async () => {
      vi.mocked(getUserAccountByApiId).mockResolvedValue(null);
      const req = makeRequest({ id: "bad-api-id", merchant: "Walmart", amount: "25" });
      const res = await GET(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/invalid api id/i);
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when the rate limit is exceeded", async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: 9999999999,
      });
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "25" });
      const res = await GET(req);
      expect(res.status).toBe(429);
    });

    it("includes Retry-After header in 429 response", async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: 9999999999,
      });
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "25" });
      const res = await GET(req);
      expect(res.headers.get("Retry-After")).toBeTruthy();
    });

    it("includes rate limit headers in 429 response", async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: 9999999999,
      });
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "25" });
      const res = await GET(req);
      expect(res.headers.get("X-RateLimit-Limit")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    });
  });

  describe("entry limit", () => {
    it("returns 403 when the entry limit is reached", async () => {
      vi.mocked(assertBelowEntryLimit).mockRejectedValue(
        new Error("Free plan limit reached (200 entries). Upgrade to premium for unlimited entries.")
      );
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "25" });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("returns the error message in the response body", async () => {
      vi.mocked(assertBelowEntryLimit).mockRejectedValue(
        new Error("Free plan limit reached (200 entries).")
      );
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "25" });
      const res = await GET(req);
      const body = await res.json();
      expect(body.error).toContain("200");
    });
  });

  describe("successful ingestion", () => {
    it("returns 200 with ok: true for a valid request", async () => {
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "25.50" });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("echoes back merchant and amount", async () => {
      const req = makeRequest({ id: "valid-api-id", merchant: "Whole Foods", amount: "87.32" });
      const res = await GET(req);
      const body = await res.json();
      expect(body.merchant).toBe("Whole Foods");
      expect(body.amount).toBe(87.32);
    });

    it("defaults card to 'Unknown' when not provided", async () => {
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "10" });
      const res = await GET(req);
      const body = await res.json();
      expect(body.card).toBe("Unknown");
    });

    it("uses the provided card label", async () => {
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "10", card: "Amex" });
      const res = await GET(req);
      const body = await res.json();
      expect(body.card).toBe("Amex");
    });

    it("includes a timestamp in the response", async () => {
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "10" });
      const res = await GET(req);
      const body = await res.json();
      expect(body.timestamp).toBeTruthy();
      expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date");
    });

    it("trims whitespace from merchant and id params", async () => {
      const req = makeRequest({ id: " valid-api-id ", merchant: "  Walmart  ", amount: "10" });
      const res = await GET(req);
      // If the id is trimmed correctly, getUserAccountByApiId will be called with "valid-api-id"
      expect(getUserAccountByApiId).toHaveBeenCalledWith(
        expect.anything(),
        "valid-api-id"
      );
    });
  });

  describe("graceful rate-limit degradation", () => {
    it("still processes the request if KV is unavailable (getCloudflareContext throws)", async () => {
      vi.mocked(getCloudflareContext).mockRejectedValue(new Error("KV unavailable"));
      const req = makeRequest({ id: "valid-api-id", merchant: "Walmart", amount: "25" });
      const res = await GET(req);
      // Should fall through to success despite the KV error
      expect(res.status).toBe(200);
    });
  });
});
