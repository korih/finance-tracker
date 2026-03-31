import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getUserAccountByApiId, assertBelowEntryLimit } from "@/lib/user-account";
import { rateLimit } from "@/lib/rate-limit";

/** 60 requests per hour per API key. */
const RATE_LIMIT = 60;
const RATE_WINDOW_SECS = 3600;

/**
 * Ingest a transaction via a simple GET request.
 *
 * GET /api/ingest?id=API_ID&merchant=Walmart&amount=25.50&card=Visa
 *
 * Parameters:
 *   id       — your API ID (required)
 *   merchant — merchant / vendor name (required)
 *   amount   — positive number, dollars (required)
 *   card     — card / payment method label (optional, defaults to "Unknown")
 *
 * Returns 200 { ok: true, merchant, amount, card, timestamp } on success.
 * Returns 400 for missing/invalid params, 401 for an invalid API ID.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const apiId    = searchParams.get("id")?.trim();
  const merchant = searchParams.get("merchant")?.trim();
  const amountRaw = searchParams.get("amount")?.trim();
  const card     = searchParams.get("card")?.trim() || "Unknown";

  if (!apiId || !merchant || !amountRaw) {
    return NextResponse.json(
      { error: "Required parameters: id, merchant, amount" },
      { status: 400 }
    );
  }

  // Strip currency symbols, spaces, and commas (e.g. "$1,234.50" → "1234.50")
  const amountCleaned = amountRaw.replace(/[^0-9.]/g, "");
  const amount = Math.abs(parseFloat(amountCleaned));
  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }

  const db      = await getDB();
  const account = await getUserAccountByApiId(db, apiId);

  if (!account) {
    return NextResponse.json({ error: "Invalid API ID" }, { status: 401 });
  }

  // Rate limiting: 60 requests per hour per API key
  try {
    const { env } = await getCloudflareContext({ async: true });
    const kv = (env as unknown as { RATE_LIMIT_KV: KVNamespace }).RATE_LIMIT_KV;
    if (kv) {
      const rl = await rateLimit(kv, `ingest:${apiId}`, {
        limit: RATE_LIMIT,
        windowSecs: RATE_WINDOW_SECS,
      });
      if (!rl.allowed) {
        return NextResponse.json(
          { error: `Rate limit exceeded. Try again after ${new Date(rl.resetAt * 1000).toISOString()}.` },
          {
            status: 429,
            headers: {
              "Retry-After": String(rl.resetAt - Math.floor(Date.now() / 1000)),
              "X-RateLimit-Limit": String(RATE_LIMIT),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(rl.resetAt),
            },
          }
        );
      }
    }
  } catch {
    // If KV is unavailable (e.g. local dev without binding), allow the request through
  }

  try {
    await assertBelowEntryLimit(db, account);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Entry limit reached" },
      { status: 403 }
    );
  }

  const timestamp = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO transactions
         (spreadsheet_id, user_id, timestamp, merchant, name, amount, card, source, excluded)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'api', 0)`
    )
    .bind(
      account.spreadsheet_id,
      account.user_id,
      timestamp,
      merchant,
      merchant,
      amount,
      card
    )
    .run();

  return NextResponse.json({ ok: true, merchant, amount, card, timestamp });
}
