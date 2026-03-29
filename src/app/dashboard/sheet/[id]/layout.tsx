import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getOrCreateUserAccount } from "@/lib/user-account";
import { AiChatPanel } from "@/components/ai-chat-panel";

export default async function SheetLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const db      = await getDB();
  const account = await getOrCreateUserAccount(db, session.user.id);

  // Reject requests for a sheet ID that doesn't belong to this user
  if (account.spreadsheet_id !== id) redirect("/dashboard");

  return (
    <>
      {children}
      <AiChatPanel spreadsheetId={id} />
    </>
  );
}
