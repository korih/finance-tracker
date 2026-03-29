import Link from "next/link";

export interface ActivityItem {
  type: "income" | "expense";
  name: string;
  date: string;   // ISO string or YYYY-MM-DD
  amount: number;
  category?: string | null;
}

interface Props {
  items: ActivityItem[];
  sheetId: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("default", { month: "short", day: "numeric" });
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function RecentActivityPanel({ items, sheetId }: Props) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-base">Recent</span>
        <Link
          href={`/dashboard/sheet/${sheetId}/expenses`}
          className="text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          See all
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No recent activity for this period.
        </p>
      ) : (
        <div className="divide-y divide-border -mx-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-1 py-2.5">
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{
                  backgroundColor:
                    item.type === "income"
                      ? "rgba(167,139,250,0.15)"
                      : "rgba(239,68,68,0.12)",
                }}
              >
                {item.type === "income" ? "💰" : "🛍️"}
              </div>

              {/* Name + date */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
              </div>

              {/* Amount */}
              <span
                className="text-sm font-semibold tabular-nums shrink-0"
                style={{
                  color:
                    item.type === "income" ? "var(--accent2)" : "var(--accent3)",
                }}
              >
                {item.type === "income" ? "+" : "-"}{fmt(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
