import type { SpendingStats } from "@/lib/stats";

export function CardBreakdown({ data, accent = "red" }: { data: SpendingStats["byCard"]; accent?: "green" | "red" }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No card data found.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((entry) => (
        <div key={entry.card} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium truncate max-w-[70%]">{entry.card}</span>
            <span className="text-muted-foreground tabular-nums">
              ${entry.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
              <span className="text-xs">({entry.pct}%)</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${entry.pct}%`, background: accent === "red" ? "rgba(239,68,68,0.6)" : "rgba(167,139,250,0.6)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
