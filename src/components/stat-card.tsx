import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  /** "green" = primary bg, "red" = red bg, omit for plain white card */
  color?: "green" | "red";
  /** @deprecated use color="green" */
  highlight?: boolean;
}

export function StatCard({ label, value, sub, color, highlight }: StatCardProps) {
  const resolvedColor = color ?? (highlight ? "green" : undefined);

  const cardCls =
    resolvedColor === "green"
      ? "bg-primary text-primary-foreground border-primary shadow-md"
      : resolvedColor === "red"
        ? "text-white border-transparent shadow-md"
        : "shadow-sm";

  const labelCls =
    resolvedColor === "green" ? "text-primary-foreground/70"
    : resolvedColor === "red"  ? "text-white/70"
    : "text-muted-foreground";

  const subCls =
    resolvedColor === "green" ? "text-primary-foreground/60"
    : resolvedColor === "red"  ? "text-white/60"
    : "text-muted-foreground";

  return (
    <Card
      className={cardCls}
      style={resolvedColor === "red" ? { background: "#C94040" } : undefined}
    >
      <CardContent className="pt-5 pb-5">
        <p className={`text-xs font-medium uppercase tracking-wide ${labelCls}`}>
          {label}
        </p>
        <p className="text-2xl font-bold mt-1.5 tabular-nums">{value}</p>
        {sub && <p className={`text-xs mt-1 ${subCls}`}>{sub}</p>}
      </CardContent>
    </Card>
  );
}
