import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, sub, highlight }: StatCardProps) {
  return (
    <Card
      className={
        highlight
          ? "bg-primary text-primary-foreground border-primary shadow-md"
          : "shadow-sm"
      }
    >
      <CardContent className="pt-5 pb-5">
        <p
          className={`text-xs font-medium uppercase tracking-wide ${highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}
        >
          {label}
        </p>
        <p className="text-2xl font-bold mt-1.5 tabular-nums">{value}</p>
        {sub && (
          <p
            className={`text-xs mt-1 ${highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}
          >
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
