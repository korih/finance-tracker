import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDB, queryTransactions } from "@/lib/db";
import { getOrCreateUserAccount } from "@/lib/user-account";
import { ApiKeyPanel } from "@/components/api-key-panel";
import { fetchIncomeEntries, type IncomeEntry } from "@/lib/income";
import { processRecurringRules } from "@/lib/recurring";
import { getCategories, classifyAll } from "@/lib/classify";
import { getSavingsGoals } from "@/lib/savings";
import { SheetNav } from "@/components/sheet-nav";
import { StatCard } from "@/components/stat-card";
import { OverviewChart, type OverviewDataPoint } from "@/components/overview-chart";
import { SpendingByCategoryPanel } from "@/components/spending-by-category-panel";
import { RecentActivityPanel, type ActivityItem } from "@/components/recent-activity-panel";
import { SavingsGoalsPanel } from "@/components/savings-goals-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";
import type { Transaction } from "@/lib/stats";

// ── Period types ─────────────────────────────────────────────────────────────

type OverviewPeriod = "week" | "month" | "year" | "all";
const VALID_PERIODS: OverviewPeriod[] = ["week", "month", "year", "all"];

function parsePeriod(raw: string | undefined): OverviewPeriod {
  if (raw && (VALID_PERIODS as string[]).includes(raw)) return raw as OverviewPeriod;
  return "year";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNet(n: number) {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseDate(str: string): Date {
  return new Date(str.includes("T") ? str : str + "T12:00:00");
}

// ── Filtering ────────────────────────────────────────────────────────────────

function filterTransactions(
  txns: Transaction[],
  period: OverviewPeriod,
  year: number,
  month: number
): Transaction[] {
  if (period === "all") return txns;
  if (period === "week") {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 0=Mon
    const mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(now.getDate() - dow);
    const end = new Date(mon); end.setDate(mon.getDate() + 7);
    return txns.filter((t) => {
      const d = parseDate(t.timestamp);
      return !isNaN(d.getTime()) && d >= mon && d < end;
    });
  }
  if (period === "month") {
    return txns.filter((t) => {
      const d = parseDate(t.timestamp);
      return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }
  // year
  return txns.filter((t) => {
    const d = parseDate(t.timestamp);
    return !isNaN(d.getTime()) && d.getFullYear() === year;
  });
}

function filterIncome(
  entries: IncomeEntry[],
  period: OverviewPeriod,
  year: number,
  month: number
): IncomeEntry[] {
  if (period === "all") return entries;
  if (period === "week") {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7;
    const mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(now.getDate() - dow);
    const end = new Date(mon); end.setDate(mon.getDate() + 7);
    return entries.filter((e) => {
      const d = parseDate(e.date);
      return !isNaN(d.getTime()) && d >= mon && d < end;
    });
  }
  if (period === "month") {
    return entries.filter((e) => {
      const d = parseDate(e.date);
      return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }
  return entries.filter((e) => {
    const d = parseDate(e.date);
    return !isNaN(d.getTime()) && d.getFullYear() === year;
  });
}

// ── Chart data builders ───────────────────────────────────────────────────────

function buildChartData(
  period: OverviewPeriod,
  year: number,
  month: number,
  allTxns: Transaction[],
  allIncome: IncomeEntry[]
): OverviewDataPoint[] {
  if (period === "week") {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7;
    const mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(now.getDate() - dow);
    const INC: number[] = Array(7).fill(0);
    const EXP: number[] = Array(7).fill(0);
    const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (const e of allIncome) {
      const d = parseDate(e.date);
      const diff = Math.floor((d.getTime() - mon.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) INC[diff] += e.amount;
    }
    for (const t of allTxns) {
      const d = parseDate(t.timestamp);
      if (isNaN(d.getTime())) continue;
      const diff = Math.floor((d.getTime() - mon.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) EXP[diff] += t.amount;
    }
    return LABELS.map((label, i) => ({
      label,
      income: Math.round(INC[i] * 100) / 100,
      expenses: Math.round(EXP[i] * 100) / 100,
    }));
  }

  if (period === "month") {
    const daysInMonth = new Date(year, month, 0).getDate();
    const numWeeks = Math.ceil(daysInMonth / 7);
    const INC: number[] = Array(numWeeks).fill(0);
    const EXP: number[] = Array(numWeeks).fill(0);
    const monthName = new Date(year, month - 1).toLocaleString("default", { month: "short" });

    for (const e of allIncome) {
      const d = parseDate(e.date);
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
      const wk = Math.min(Math.floor((d.getDate() - 1) / 7), numWeeks - 1);
      INC[wk] += e.amount;
    }
    for (const t of allTxns) {
      const d = parseDate(t.timestamp);
      if (isNaN(d.getTime()) || d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
      const wk = Math.min(Math.floor((d.getDate() - 1) / 7), numWeeks - 1);
      EXP[wk] += t.amount;
    }
    return Array.from({ length: numWeeks }, (_, i) => ({
      label: `${monthName} ${i * 7 + 1}`,
      income: Math.round(INC[i] * 100) / 100,
      expenses: Math.round(EXP[i] * 100) / 100,
    }));
  }

  if (period === "year") {
    const byMonth = new Map<string, { income: number; expenses: number }>();
    for (const e of allIncome) {
      const key = e.date.slice(0, 7);
      const b = byMonth.get(key) ?? { income: 0, expenses: 0 };
      b.income += e.amount;
      byMonth.set(key, b);
    }
    for (const t of allTxns) {
      const d = parseDate(t.timestamp);
      if (isNaN(d.getTime()) || d.getFullYear() !== year) continue;
      const key = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = byMonth.get(key) ?? { income: 0, expenses: 0 };
      b.expenses += t.amount;
      byMonth.set(key, b);
    }
    const now = new Date();
    const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
    return Array.from({ length: maxMonth }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      const b = byMonth.get(key) ?? { income: 0, expenses: 0 };
      return {
        label: new Date(year, i).toLocaleString("default", { month: "short" }),
        income: Math.round(b.income * 100) / 100,
        expenses: Math.round(b.expenses * 100) / 100,
      };
    });
  }

  // all — by year
  const byYear = new Map<string, { income: number; expenses: number }>();
  for (const e of allIncome) {
    const key = e.date.slice(0, 4);
    const b = byYear.get(key) ?? { income: 0, expenses: 0 };
    b.income += e.amount;
    byYear.set(key, b);
  }
  for (const t of allTxns) {
    const d = parseDate(t.timestamp);
    if (isNaN(d.getTime())) continue;
    const key = String(d.getFullYear());
    const b = byYear.get(key) ?? { income: 0, expenses: 0 };
    b.expenses += t.amount;
    byYear.set(key, b);
  }
  const years = Array.from(new Set([...byYear.keys()])).sort();
  return years.map((key) => {
    const b = byYear.get(key)!;
    return {
      label: key,
      income: Math.round(b.income * 100) / 100,
      expenses: Math.round(b.expenses * 100) / 100,
    };
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; y?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [{ id }, { period: rawPeriod, y: rawYear }] = await Promise.all([params, searchParams]);

  const period = parsePeriod(rawPeriod);
  const now = new Date();
  const year = rawYear ? parseInt(rawYear) : now.getFullYear();
  const month = now.getMonth() + 1; // always current month for "month" period

  const db = await getDB();
  await processRecurringRules(db, id);
  await classifyAll(db, id);

  const headersList = await headers();
  const host  = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${proto}://${host}`;

  const [allTxns, incomeEntries, categories, goals, account] = await Promise.all([
    queryTransactions(db, id),
    fetchIncomeEntries(id, period === "all" ? "all" : "year", year),
    getCategories(db, id),
    getSavingsGoals(db, id),
    getOrCreateUserAccount(db, session.user.id!),
  ]);

  // Filter to period
  const txns   = filterTransactions(allTxns, period, year, month);
  const income = filterIncome(incomeEntries, period, year, month);

  // Totals
  const totalIncome   = Math.round(income.reduce((s, e) => s + e.amount, 0) * 100) / 100;
  const totalExpenses = Math.round(txns.reduce((s, t) => s + t.amount, 0) * 100) / 100;
  const net = Math.round((totalIncome - totalExpenses) * 100) / 100;

  // Chart data (uses ALL transactions/income for the year/all, filtered inside builder)
  const chartData = buildChartData(period, year, month, allTxns, incomeEntries);

  // Category totals
  const catMap = new Map<string, number>();
  for (const t of txns) {
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

  // Recent activity (combined, sorted by date, last 8)
  const recentActivity: ActivityItem[] = [
    ...txns.map((t) => ({
      type: "expense" as const,
      name: t.merchant || t.name,
      date: t.timestamp,
      amount: t.amount,
      category: t.category,
    })),
    ...income.map((e) => ({
      type: "income" as const,
      name: e.source,
      date: e.date,
      amount: e.amount,
    })),
  ]
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
    .slice(0, 8);

  // Period label for stat cards
  const periodLabel =
    period === "week" ? "This Week"
    : period === "month" ? now.toLocaleString("default", { month: "long", year: "numeric" })
    : period === "year" ? String(year)
    : "All Time";

  // Chart title
  const chartTitle =
    period === "week" ? "This Week by Day"
    : period === "month" ? `${now.toLocaleString("default", { month: "long" })} by Week`
    : period === "year" ? `${year} by Month`
    : "All Time by Year";

  return (
    <div className="flex flex-1 flex-col min-h-screen">
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
        <SheetNav sheetId={id} active="overview" />

        {/* Period tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          {VALID_PERIODS.map((p) => (
            <Link
              key={p}
              href={`/dashboard/sheet/${id}/overview?period=${p}${p === "year" ? `&y=${year}` : ""}`}
              className={[
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {p === "week" ? "This Week"
               : p === "month" ? "This Month"
               : p === "year" ? String(year)
               : "All Time"}
            </Link>
          ))}

          {/* Year prev/next when period=year */}
          {period === "year" && (
            <div className="flex items-center gap-0.5 ml-1 border-l pl-1" style={{ borderColor: "var(--vault-border)" }}>
              <Link
                href={`/dashboard/sheet/${id}/overview?period=year&y=${year - 1}`}
                className="px-1.5 py-1 rounded text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ‹
              </Link>
              <Link
                href={`/dashboard/sheet/${id}/overview?period=year&y=${year + 1}`}
                className="px-1.5 py-1 rounded text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ›
              </Link>
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label={`Income · ${periodLabel}`}   value={fmt(totalIncome)}   color="purple" />
          <StatCard label={`Expenses · ${periodLabel}`} value={fmt(totalExpenses)} color="red" />
          <StatCard
            label={`Net · ${periodLabel}`}
            value={fmtNet(net)}
            color={net >= 0 ? "green" : "red"}
          />
        </div>

        {/* Overview chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{chartTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <OverviewChart data={chartData} />
          </CardContent>
        </Card>

        {/* Spending by Category + Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <SpendingByCategoryPanel totals={categoryTotals} sheetId={id} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <RecentActivityPanel items={recentActivity} sheetId={id} />
            </CardContent>
          </Card>
        </div>

        {/* Savings Goals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Savings Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <SavingsGoalsPanel goals={goals} spreadsheetId={id} />
          </CardContent>
        </Card>

        {/* API Access */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">API Access</CardTitle>
          </CardHeader>
          <CardContent>
            <ApiKeyPanel apiId={account.api_id} baseUrl={baseUrl} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
