import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listSpreadsheets } from "@/lib/google-sheets";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sheets = await listSpreadsheets(session.accessToken);
    return NextResponse.json(sheets);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list spreadsheets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
