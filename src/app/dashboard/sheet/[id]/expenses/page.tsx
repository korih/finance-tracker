import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { syncTransactions } from "@/lib/sync";
import {
  getDB,
  queryTransactions,
  queryAllTransactions,
  getDistinctCards,
  getDistinctMerchants,
} from "@/lib/db";
import { getRecurringRules, processRecurringRules } from "@/lib/recurring";
import { getCategories, classifyAll } from "@/lib/classify";
import { ManageCategoriesPanel } from "@/components/manage-categories-panel";
import { CategoryPieChart } from "@/components/category-pie-chart";
import {
  computeStatsFromTransactions,
  filterTransactionsByPeriod,
  type Period,
} from "@/lib/stats";
import { StatCard } from "@/components/stat-card";
import { MonthlyChart } from "@/components/monthly-chart";
import { MerchantsChart } from "@/components/merchants-chart";
import { CardBreakdown } from "@/components/card-breakdown";
import { TransactionsTable } from "@/components/transactions-table";
import { RecurringPanel } from "@/components/recurring-panel";
import { PeriodTabs } from "@/components/period-tabs";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { SheetNav } from "@/components/sheet-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";

const VALID_PERIODS: Period[] = ["day", "week", "month", "year", "all"];

function parsePeriod(raw: string | undefined): Period {
  if (raw && (VALID_PERIODS as string[]).includes(raw)) return raw as Period;
  return "month";
}

function getPeriodLabel(period: Period, year?: number): string {
  const now = new Date();
  if (period === "day") return "Today";
  if (period === "week") return "This Week";
  if (period === "month")
    return now.toLocaleString("default", { month: "long", year: "numeric" });
  if (period === "year") return String(year ?? now.getFullYear());
  return "All Time";
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; y?: string; d?: string }>;
}) {
  const session = await auth();

  if (!session?.accessToken) redirect("/auth/signin");
  if (session.error === "RefreshTokenError") redirect("/auth/signin");

  const [{ id }, { period: rawPeriod, y: rawYear, d: localDate }] =
    await Promise.all([params, searchParams]);

  const period = parsePeriod(rawPeriod);
  const year = rawYear ? parseInt(rawYear) : undefined;

  // 1. Sync: fetch only new sheet rows
  const db = await getDB();
  await syncTransactions(db, session.accessToken, id);
  await processRecurringRules(db, id);
  await classifyAll(db, id);

  // 2. Fetch data
  const [activeTransactions, allTransactions, cards, merchants, recurringRules, categories] = await Promise.all([
    queryTransactions(db, id),                    // non-excluded, for stats
    queryAllTransactions(db, id),                 // all rows including excluded, for table
    getDistinctCards(db, id),                     // for the add-expense card dropdown
    getDistinctMerchants(db, id),                 // for merchant autocomplete
    getRecurringRules(db, id, "expense"),          // for the recurring panel
    getCategories(db, id),                        // for category badges + manage panel
  ]);

  // 3. Filter active transactions to the selected period for stats
  const filtered = filterTransactionsByPeriod(activeTransactions, period, {
    year,
    localDate,
  });

  // 4. Filter all transactions to the same period for the table
  const tableRows = allTransactions.filter((row) => {
    // Soft-deleted recurring entries are hidden entirely (no restore option; delete is permanent for recurring)
    if (row.excluded && row.source === "recurring") return false;
    // Sheet/manual excluded rows are shown greyed-out so the user can restore them
    if (row.excluded) return true;
    return filtered.some(
      (t) => t.timestamp === row.timestamp && t.merchant === row.merchant && t.amount === row.amount
    );
  });

  // 5. Compute stats from filtered active transactions
  const stats = computeStatsFromTransactions(filtered, period, localDate);

  // 6. Compute category totals for the pie chart
  const catMap = new Map<string, number>();
  for (const t of filtered) {
    if (t.category) catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
  }
  const grandCatTotal = Array.from(catMap.values()).reduce((s, v) => s + v, 0);
  const categoryTotals = Array.from(catMap.entries())
    .map(([name, total]) => {
      const cat = categories.find((c) => c.name === name);
      return {
        name,
        color: cat?.color ?? "#8b8a96",
        total: Math.round(total * 100) / 100,
        pct: grandCatTotal > 0 ? Math.round((total / grandCatTotal) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const periodLabel = getPeriodLabel(period, year);

  return (
    <div className="flex flex-1 flex-col min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <span className="font-semibold text-foreground">Finance Tracker</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {session.user?.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Sheet-level nav */}
        <SheetNav sheetId={id} active="expenses" />

        {/* Period tabs + add button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <PeriodTabs sheetId={id} period={period} />
          <div className="flex items-center gap-3">
            {stats.transactionCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {stats.transactionCount} transactions
              </p>
            )}
            <AddTransactionDialog spreadsheetId={id} existingCards={cards} existingMerchants={merchants} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={periodLabel} value={fmt(stats.totalSpent)} color="red" />
          <StatCard label="Avg Transaction" value={fmt(stats.avgTransaction)} />
          <StatCard
            label="Largest Transaction"
            value={fmt(stats.largestTransaction.amount)}
            sub={stats.largestTransaction.merchant}
          />
          <StatCard
            label="Transactions"
            value={stats.transactionCount.toString()}
          />
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {period === "all" ? "Spending by Year"
                  : period === "year" ? "Spending by Month"
                  : period === "month" ? "Spending by Week"
                  : period === "week" ? "Spending by Day"
                  : "Today's Spending"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyChart data={stats.spendingBreakdown} />
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

        {/* Bottom row: 2×2 grid */}
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
              <CardTitle className="text-base">Recurring Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <RecurringPanel rules={recurringRules} spreadsheetId={id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending by Category · {periodLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryPieChart data={categoryTotals} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ManageCategoriesPanel categories={categories} spreadsheetId={id} />
            </CardContent>
          </Card>
        </div>

        {/* Full-width Recent Transactions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[420px] overflow-y-auto">
              <TransactionsTable rows={tableRows} spreadsheetId={id} categories={categories} />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
