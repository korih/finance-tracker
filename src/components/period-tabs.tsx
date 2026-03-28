"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Period } from "@/lib/stats";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All Time" },
];

/** YYYY-MM-DD in the browser's local timezone. */
function localDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function periodHref(sheetId: string, period: Period): string {
  const base = `/dashboard/sheet/${sheetId}/expenses?period=${period}`;
  // Attach local date for periods that depend on "today"
  if (period === "day" || period === "week" || period === "month") {
    return `${base}&d=${localDateStr()}`;
  }
  return base;
}

export function PeriodTabs({
  sheetId,
  period,
}: {
  sheetId: string;
  period: Period;
}) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
      {PERIODS.map((p) => (
        <Link
          key={p.value}
          href={periodHref(sheetId, p.value)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            period === p.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
