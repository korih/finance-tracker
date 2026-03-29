import { Card, CardContent } from "@/components/ui/card";

// Colors via CSS vars — keep in sync with Vault design tokens in globals.css
const COLOR_MAP = {
  purple: "var(--accent)",       // income, primary actions
  green:  "var(--accent2)",      // positive change, savings
  red:    "var(--accent3)",      // expenses, spending (maps to pink/accent3)
} as const;

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  /** "purple" = income · "green" = positive/savings · "red" = expenses/negative */
  color?: "purple" | "green" | "red";
  /** @deprecated use color="green" */
  highlight?: boolean;
}

export function StatCard({ label, value, sub, color, highlight }: StatCardProps) {
  const resolvedColor = color ?? (highlight ? "green" : undefined);
  const valueColor = resolvedColor ? COLOR_MAP[resolvedColor] : undefined;

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          {label}
        </p>
        <p
          className="text-2xl font-semibold tabular-nums font-mono"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1 text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
