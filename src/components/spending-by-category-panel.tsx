import Link from "next/link";

export interface CategoryTotal {
  name: string;
  color: string;
  total: number;
  pct: number;
}

interface Props {
  totals: CategoryTotal[];
  sheetId: string;
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SpendingByCategoryPanel({ totals, sheetId }: Props) {
  const top = totals.slice(0, 6);
  const maxTotal = top[0]?.total ?? 1;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-base">Spending</span>
        <Link
          href={`/dashboard/sheet/${sheetId}/expenses`}
          className="text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          See all
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No categorized spending yet. Add categories on the Expenses page.
        </p>
      ) : (
        <div className="space-y-3">
          {top.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium">{cat.name}</span>
                </div>
                <span className="tabular-nums text-muted-foreground">{fmt(cat.total)}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-hover)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(cat.total / maxTotal) * 100}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
