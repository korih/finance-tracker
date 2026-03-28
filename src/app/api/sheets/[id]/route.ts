import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSheetHeaders, getSheetRowsFrom } from "@/lib/google-sheets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [headers, { rows }] = await Promise.all([
      getSheetHeaders(session.accessToken, id),
      getSheetRowsFrom(session.accessToken, id, 0),
    ]);
    return NextResponse.json({ headers, rows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read sheet data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
