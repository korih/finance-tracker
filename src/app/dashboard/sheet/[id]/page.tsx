import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSheetData } from "@/lib/google-sheets";
import { computeStats } from "@/lib/stats";
import { StatCard } from "@/components/stat-card";
import { MonthlyChart } from "@/components/monthly-chart";
import { MerchantsChart } from "@/components/merchants-chart";
import { CardBreakdown } from "@/components/card-breakdown";
import { TransactionsTable } from "@/components/transactions-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.accessToken) redirect("/auth/signin");
  if (session.error === "RefreshTokenError") redirect("/auth/signin");

  const { id } = await params;
  const data = await getSheetData(session.accessToken, id);
  const stats = computeStats(data);

  return (
    <div className="flex flex-1 flex-col min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1">
              ← Back
            </Button>
          </Link>
          <span className="font-bold text-primary">Finance Tracker</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {session.user?.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Date range */}
        {stats.dateRange && (
          <p className="text-sm text-muted-foreground">
            {stats.dateRange.from} – {stats.dateRange.to} &nbsp;·&nbsp;{" "}
            {stats.recentTransactions.length === 20 ? "20+" : data.rows.length} transactions
          </p>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Spent" value={fmt(stats.totalSpent)} highlight />
          <StatCard
            label="This Month"
            value={fmt(stats.thisMonthTotal)}
            sub={stats.dateRange?.to}
          />
          <StatCard label="Avg Transaction" value={fmt(stats.avgTransaction)} />
          <StatCard
            label="Largest Transaction"
            value={fmt(stats.largestTransaction.amount)}
            sub={stats.largestTransaction.merchant}
          />
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyChart data={stats.monthlyTotals} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <MerchantsChart data={stats.topMerchants} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending by Card</CardTitle>
            </CardHeader>
            <CardContent>
              <CardBreakdown data={stats.byCard} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TransactionsTable rows={stats.recentTransactions} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
