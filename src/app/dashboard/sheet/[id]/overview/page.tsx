import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDB, queryTransactions } from "@/lib/db";
import { fetchIncomeEntries, type IncomePeriod } from "@/lib/income";
import { SheetNav } from "@/components/sheet-nav";
import { StatCard } from "@/components/stat-card";
import { OverviewChart, type OverviewDataPoint } from "@/components/overview-chart";
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

function fmtNet(n: number) {
  const prefix = n >= 0 ? "+" : "-";
  return `${prefix}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function OverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; y?: string }>;
}) {
  const session = await auth();
  if (!session?.accessToken) redirect("/auth/signin");
  if (session.error === "RefreshTokenError") redirect("/auth/signin");

  const [{ id }, { period: rawPeriod, y: rawYear }] = await Promise.all([
    params,
    searchParams,
  ]);

  const period = parsePeriod(rawPeriod);
  const year = rawYear ? parseInt(rawYear) : new Date().getFullYear();

  const db = await getDB();

  const [incomeEntries, transactions] = await Promise.all([
    fetchIncomeEntries(id, period, year),
    queryTransactions(db, id),
  ]);

  // Build shared bucket keys. For "year": 12 months YYYY-MM. For "all": all distinct years.
  let chartData: OverviewDataPoint[];
  let totalIncome = 0;
  let totalExpenses = 0;

  if (period === "year") {
    // 12-month buckets for the selected year
    const incomeByMonth = new Map<string, number>();
    const expenseByMonth = new Map<string, number>();

    for (const e of incomeEntries) {
      const key = e.date.slice(0, 7); // YYYY-MM
      incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + e.amount);
    }
    for (const t of transactions) {
      const d = new Date(t.timestamp);
      if (isNaN(d.getTime())) continue;
      if (d.getFullYear() !== year) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + t.amount);
    }

    totalIncome = Array.from(incomeByMonth.values()).reduce((s, v) => s + v, 0);
    totalExpenses = Array.from(expenseByMonth.values()).reduce((s, v) => s + v, 0);

    const now = new Date();
    const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;

    chartData = Array.from({ length: maxMonth }, (_, i) => {
      const m = i + 1;
      const key = `${year}-${String(m).padStart(2, "0")}`;
      const label = new Date(year, i).toLocaleString("default", { month: "short" });
      return {
        label,
        income: Math.round((incomeByMonth.get(key) ?? 0) * 100) / 100,
        expenses: Math.round((expenseByMonth.get(key) ?? 0) * 100) / 100,
      };
    });
  } else {
    // All-time: bucket by year
    const incomeByYear = new Map<string, number>();
    const expenseByYear = new Map<string, number>();

    for (const e of incomeEntries) {
      const key = e.date.slice(0, 4);
      incomeByYear.set(key, (incomeByYear.get(key) ?? 0) + e.amount);
    }
    for (const t of transactions) {
      const d = new Date(t.timestamp);
      if (isNaN(d.getTime())) continue;
      const key = String(d.getFullYear());
      expenseByYear.set(key, (expenseByYear.get(key) ?? 0) + t.amount);
    }

    totalIncome = Array.from(incomeByYear.values()).reduce((s, v) => s + v, 0);
    totalExpenses = Array.from(expenseByYear.values()).reduce((s, v) => s + v, 0);

    const allYears = Array.from(new Set([...incomeByYear.keys(), ...expenseByYear.keys()])).sort();
    chartData = allYears.map((key) => ({
      label: key,
      income: Math.round((incomeByYear.get(key) ?? 0) * 100) / 100,
      expenses: Math.round((expenseByYear.get(key) ?? 0) * 100) / 100,
    }));
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpenses = Math.round(totalExpenses * 100) / 100;
  const net = totalIncome - totalExpenses;

  const periodLabel = period === "year" ? String(year) : "All Time";

  return (
    <div className="flex flex-1 flex-col min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <span className="font-bold text-primary">Finance Tracker</span>
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
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {VALID_PERIODS.map((p) => (
            <Link
              key={p}
              href={`/dashboard/sheet/${id}/overview?period=${p}`}
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

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label={`Income · ${periodLabel}`} value={fmt(totalIncome)} color="green" />
          <StatCard label={`Expenses · ${periodLabel}`} value={fmt(totalExpenses)} color="red" />
          <StatCard
            label={`Net · ${periodLabel}`}
            value={fmtNet(net)}
            color={net >= 0 ? "green" : "red"}
          />
        </div>

        {/* Line chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {period === "year" ? `${year} Income vs Expenses by Month` : "Income vs Expenses by Year"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OverviewChart data={chartData} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
