import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getOrCreateUserAccount } from "@/lib/user-account";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const db      = await getDB();
  const account = await getOrCreateUserAccount(db, session.user.id);

  redirect(`/dashboard/sheet/${account.spreadsheet_id}/overview`);
}
