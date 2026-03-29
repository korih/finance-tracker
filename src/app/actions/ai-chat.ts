"use server";

import { auth } from "@/lib/auth";
import { getDB, queryTransactions } from "@/lib/db";
import { fetchIncomeEntries } from "@/lib/income";
import { getAI, AI_MODEL } from "@/lib/ai";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function askFinanceAI(
  question: string,
  spreadsheetId: string
): Promise<{ answer: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const now = new Date();
  const currentYear = now.getFullYear();

  const db = await getDB();

  // Fetch all non-excluded transactions + all income entries
  const [allTransactions, allIncome] = await Promise.all([
    queryTransactions(db, spreadsheetId),
    fetchIncomeEntries(spreadsheetId, "all"),
  ]);

  // Split into current year vs prior for context efficiency
  const currentYearTxns = allTransactions.filter((t) =>
    t.timestamp.startsWith(String(currentYear)) ||
    new Date(t.timestamp).getFullYear() === currentYear
  );
  const priorTxns = allTransactions.filter((t) => {
    const y = new Date(t.timestamp).getFullYear();
    return y < currentYear;
  });

  // Pre-compute aggregates for faster AI answers
  const totalSpentThisYear = currentYearTxns.reduce((s, t) => s + t.amount, 0);
  const totalIncomeThisYear = allIncome
    .filter((e) => e.date.startsWith(String(currentYear)))
    .reduce((s, e) => s + e.amount, 0);

  // Merchant totals (current year)
  const merchantMap = new Map<string, number>();
  for (const t of currentYearTxns) {
    merchantMap.set(t.merchant, (merchantMap.get(t.merchant) ?? 0) + t.amount);
  }
  const topMerchants = Array.from(merchantMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([m, amt]) => `  ${m}: $${amt.toFixed(2)}`)
    .join("\n");

  // Monthly spending summary (current year)
  const monthMap = new Map<string, number>();
  for (const t of currentYearTxns) {
    const d = new Date(t.timestamp);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + t.amount);
  }
  const monthlySpending = Array.from(monthMap.entries())
    .sort()
    .map(([k, v]) => {
      const [y, m] = k.split("-");
      const label = new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "long" });
      return `  ${label} ${y}: $${v.toFixed(2)}`;
    })
    .join("\n");

  // Monthly income summary
  const incomeMonthMap = new Map<string, number>();
  for (const e of allIncome) {
    if (!e.date.startsWith(String(currentYear))) continue;
    const key = e.date.slice(0, 7);
    incomeMonthMap.set(key, (incomeMonthMap.get(key) ?? 0) + e.amount);
  }
  const monthlyIncome = Array.from(incomeMonthMap.entries())
    .sort()
    .map(([k, v]) => {
      const [y, m] = k.split("-");
      const label = new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "long" });
      return `  ${label} ${y}: $${v.toFixed(2)}`;
    })
    .join("\n");

  // Full transaction log for current year (most recent first, capped at 400)
  const txnLog = currentYearTxns
    .slice(0, 400)
    .map((t) => `  ${t.timestamp} | ${t.merchant} | ${t.card} | $${t.amount.toFixed(2)}`)
    .join("\n");

  // Prior years: just yearly totals to save tokens
  const priorYearMap = new Map<number, number>();
  for (const t of priorTxns) {
    const y = new Date(t.timestamp).getFullYear();
    if (!isNaN(y)) priorYearMap.set(y, (priorYearMap.get(y) ?? 0) + t.amount);
  }
  const priorYearSummary = Array.from(priorYearMap.entries())
    .sort()
    .map(([y, v]) => `  ${y}: $${v.toFixed(2)}`)
    .join("\n");

  // Income log (all, capped at 200)
  const incomeLog = allIncome
    .slice(0, 200)
    .map((e) => `  ${e.date} | ${e.source} | ${e.type} | $${e.amount.toFixed(2)}`)
    .join("\n");

  const systemPrompt = `You are a concise personal finance assistant. Answer the user's question using only the data provided below. Do not speculate beyond the data.

TODAY: ${toDateStr(now)}

=== ${currentYear} SUMMARY ===
Total spent: $${totalSpentThisYear.toFixed(2)}
Total income: $${totalIncomeThisYear.toFixed(2)}
Net: $${(totalIncomeThisYear - totalSpentThisYear).toFixed(2)}

=== MONTHLY SPENDING (${currentYear}) ===
${monthlySpending || "  No data"}

=== MONTHLY INCOME (${currentYear}) ===
${monthlyIncome || "  No data"}

=== TOP MERCHANTS (${currentYear}) ===
${topMerchants || "  No data"}

=== ALL TRANSACTIONS (${currentYear}) ===
Date | Merchant | Card | Amount
${txnLog || "  No transactions"}

=== INCOME LOG ===
Date | Source | Type | Amount
${incomeLog || "  No income entries"}

=== PRIOR YEAR SPENDING TOTALS ===
${priorYearSummary || "  No prior data"}

Rules:
- Be concise — one short paragraph or a few bullet points.
- Format amounts with $ and 2 decimal places.
- If the answer isn't in the data, say "I don't have that data."
- Do not make up numbers.`;

  const ai = await getAI();
  const result = await ai.run(AI_MODEL, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
  });

  return { answer: result.response?.trim() ?? "No response from AI." };
}
