import { type NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getUserAccountByApiId } from "@/lib/user-account";

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

  const amount = parseFloat(amountRaw);
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
