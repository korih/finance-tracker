import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSheetData } from "@/lib/google-sheets";

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
    const data = await getSheetData(session.accessToken, id);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read sheet data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
