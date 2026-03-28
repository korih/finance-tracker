import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listSpreadsheets } from "@/lib/google-sheets";
import { SignOutButton } from "@/components/sign-out-button";
import { SpreadsheetPicker } from "@/components/spreadsheet-picker";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.accessToken) {
    redirect("/auth/signin");
  }

  if (session.error === "RefreshTokenError") {
    redirect("/auth/signin");
  }

  const sheets = await listSpreadsheets(session.accessToken);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b px-6 py-4 flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-primary">Finance Tracker</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session.user?.email}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-semibold mb-6">Select a spreadsheet</h2>
        <SpreadsheetPicker sheets={sheets} />
      </main>
    </div>
  );
}
