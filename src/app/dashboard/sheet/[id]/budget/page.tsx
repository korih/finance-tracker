import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDB, queryTransactions } from "@/lib/db";
import { getCategories, classifyAll } from "@/lib/classify";
import { processRecurringRules } from "@/lib/recurring";
import { getBudgets } from "@/lib/budgets";
import { SheetNav } from "@/components/sheet-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { BudgetTotalEditor } from "@/components/budget-total-editor";
import { BudgetCategoryList } from "@/components/budget-category-dialog";

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function progressColor(pct: number) {
  if (pct >= 100) return "var(--accent3)";
  if (pct >= 80) return "var(--accent-warm)";
  return "var(--accent2)";
}

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;
  const db = await getDB();

  await processRecurringRules(db, id);
  await classifyAll(db, id);

  const [allTransactions, categories, budgets] = await Promise.all([
    queryTransactions(db, id),
    getCategories(db, id),
    getBudgets(db, id),
  ]);

  // ── Current month bounds ──────────────────────────────────────────────────
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  const thisMonthTxns = allTransactions.filter((t) => {
    const d = new Date(t.timestamp.includes("T") ? t.timestamp : `${t.timestamp}T12:00:00`);
    return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
  });

  const totalSpent = Math.round(thisMonthTxns.reduce((s, t) => s + t.amount, 0) * 100) / 100;

  // Per-category spending this month
  const spendingMap = new Map<string, number>();
  for (const t of thisMonthTxns) {
    if (t.category) {
      spendingMap.set(t.category, Math.round(((spendingMap.get(t.category) ?? 0) + t.amount) * 100) / 100);
    }
  }

  // ── Budget data ───────────────────────────────────────────────────────────
  const totalBudgetEntry = budgets.find((b) => b.category === "");
  const totalBudget = totalBudgetEntry?.amount ?? 0;

  const categoryBudgetRows = budgets
    .filter((b) => b.category !== "")
    .map((b) => {
      const cat = categories.find((c) => c.name === b.category);
      return {
        category: b.category,
        budget: b.amount,
        spent: spendingMap.get(b.category) ?? 0,
        color: cat?.color ?? "#8b8a96",
      };
    })
    .sort((a, b) => b.budget - a.budget);

  const budgetPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const budgetRemaining = totalBudget - totalSpent;

  // Days remaining in month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const daysRemaining = lastDay - now.getDate();

  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

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

      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full space-y-6">
        <SheetNav sheetId={id} active="budget" />

        {/* ── Monthly budget overview card ─────────────────────────────── */}
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-center">
            {monthLabel} Budget
          </p>

          {/* Editable total */}
          <BudgetTotalEditor spreadsheetId={id} current={totalBudget} />

          {totalBudget > 0 && (
            <>
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${budgetPct}%`,
                      backgroundColor: progressColor(budgetPct),
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span>
                    <span className="font-semibold tabular-nums">{fmt(totalSpent)}</span>
                    <span className="text-muted-foreground"> spent</span>
                  </span>
                  <span className={budgetRemaining < 0 ? "text-accent3 font-medium" : "text-muted-foreground"}>
                    {budgetRemaining < 0
                      ? `${fmt(Math.abs(budgetRemaining))} over`
                      : `${fmt(budgetRemaining)} left`}
                  </span>
                </div>
              </div>

              {/* Days remaining */}
              <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</span>
                {" "}until your budget resets.
              </div>

              {/* Category spending breakdown (collapsible) */}
              {categoryBudgetRows.length > 0 && (
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-medium text-primary select-none">
                    <span>Show breakdown</span>
                    <svg
                      className="h-4 w-4 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {categoryBudgetRows.map((row) => {
                      const pct = row.budget > 0 ? Math.min((row.spent / row.budget) * 100, 100) : 0;
                      return (
                        <div key={row.category} className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                              {row.category}
                            </span>
                            <span>{fmt(row.spent)} / {fmt(row.budget)}</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: progressColor(pct) }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </>
          )}

          {totalBudget === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Tap the amount above to set your monthly budget.
            </p>
          )}
        </div>

        {/* ── Category budgets ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Category Budgets
            {categoryBudgetRows.length > 0 && (
              <span className="ml-1 text-foreground">({categoryBudgetRows.length})</span>
            )}
          </h2>
          <BudgetCategoryList
            spreadsheetId={id}
            categories={categories}
            categoryBudgets={categoryBudgetRows}
          />
        </div>
      </main>
    </div>
  );
}
