import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  fetchIncomeEntries,
  computeIncomeStats,
  type IncomePeriod,
} from "@/lib/income";
import { getDB, getDistinctSources } from "@/lib/db";
import { getRecurringRules, processRecurringRules } from "@/lib/recurring";
import { classifyAll } from "@/lib/classify";
import { StatCard } from "@/components/stat-card";
import { IncomeChart } from "@/components/income-chart";
import { RecurringIncomePanel } from "@/components/recurring-income-panel";
import { SheetNav } from "@/components/sheet-nav";
import { AddIncomeDialog } from "@/components/add-income-dialog";
import { IncomeTable } from "@/components/income-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";

const VALID_PERIODS: IncomePeriod[] = ["year", "all"];

function parsePeriod(raw: string | undefined): IncomePeriod {
  if (raw && (VALID_PERIODS as string[]).includes(raw)) return raw as IncomePeriod;
  return "year";
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function IncomePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; y?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [{ id }, { period: rawPeriod, y: rawYear }] = await Promise.all([
    params,
    searchParams,
  ]);

  const period = parsePeriod(rawPeriod);
  const year = rawYear ? parseInt(rawYear) : new Date().getFullYear();

  const db = await getDB();
  await processRecurringRules(db, id);
  await classifyAll(db, id);

  const [entries, recurringRules, sources] = await Promise.all([
    fetchIncomeEntries(id, period, year),
    getRecurringRules(db, id, "income"),
    getDistinctSources(db, id),
  ]);

  const stats = computeIncomeStats(entries, period, year);

  const periodLabel =
    period === "year" ? String(year) : "All Time";

  const chartTitle =
    period === "year" ? `${year} Income by Month` : "Income by Year";

  return (
    <div className="flex flex-1 flex-col min-h-screen">
      {/* Header */}
      <header className="border-b px-6 pb-4 pt-safe-header flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
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
        <SheetNav sheetId={id} active="income" />

        {/* Period tabs + add button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            {VALID_PERIODS.map((p) => (
              <Link
                key={p}
                href={`/dashboard/sheet/${id}/income?period=${p}`}
                className={[
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  period === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {p === "year" ? String(year) : "All Time"}
              </Link>
            ))}
          </div>
          <AddIncomeDialog spreadsheetId={id} existingSources={sources} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={periodLabel} value={fmt(stats.totalIncome)} highlight />
          <StatCard
            label={`Avg ${stats.avgLabel}`}
            value={fmt(stats.avgAmount)}
          />
          <StatCard
            label="Largest Income"
            value={fmt(stats.largestEntry.amount)}
            sub={stats.largestEntry.source || undefined}
          />
          <StatCard
            label="Entries"
            value={stats.entryCount.toString()}
          />
        </div>

        {/* Chart + Recurring side by side */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{chartTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <IncomeChart data={stats.breakdown} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recurring Income</CardTitle>
            </CardHeader>
            <CardContent>
              <RecurringIncomePanel rules={recurringRules} spreadsheetId={id} />
            </CardContent>
          </Card>

        </div>

        {/* By type breakdown */}
        {stats.byType.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Income by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.byType.map((row) => (
                  <div key={row.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{row.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {fmt(row.total)} &nbsp;·&nbsp; {row.pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Income log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Income Log · {periodLabel}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[420px] overflow-y-auto">
              <IncomeTable entries={entries} spreadsheetId={id} />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
