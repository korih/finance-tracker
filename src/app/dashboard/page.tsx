import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listSpreadsheets } from "@/lib/google-sheets";
import { SignOutButton } from "@/components/sign-out-button";

const TARGET_SHEET = "Spending Spreadsheet";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.accessToken) redirect("/auth/signin");
  if (session.error === "RefreshTokenError") redirect("/auth/signin");

  const sheets = await listSpreadsheets(session.accessToken);
  const target = sheets.find((s) => s.name === TARGET_SHEET);

  if (target) {
    redirect(`/dashboard/sheet/${target.id}`);
  }

  // Not found — show error
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <span className="font-semibold text-foreground">Finance Tracker</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session.user?.email}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <div className="space-y-2 max-w-sm">
          <h1 className="text-xl font-semibold">Spreadsheet not found</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Create a Google Sheet named exactly{" "}
            <span className="font-semibold text-foreground">
              &ldquo;{TARGET_SHEET}&rdquo;
            </span>{" "}
            in your Drive, then refresh this page.
          </p>
        </div>
      </main>
    </div>
  );
}
