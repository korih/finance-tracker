"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SpendingStats } from "@/lib/stats";

interface TooltipPayload {
  value: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-sm text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        ${payload[0].value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export function MonthlyChart({
  data,
  accent = "red",
}: {
  data: SpendingStats["spendingBreakdown"];
  accent?: "green" | "red";
}) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No dated transactions found.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.total));
  // Colors match Vault design tokens: --accent3 (pink) for expenses, --accent (purple) for income
  const colors = accent === "red"
    ? { current: "#ef4444", high: "#dc2626", base: "#7f1d1d" }   /* --accent3 pink */
    : { current: "#a78bfa", high: "#7c3aed", base: "#4c1d95" };  /* --accent purple */

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#4e4d58" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v: number) =>
            `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
          }
          tick={{ fontSize: 11, fill: "#4e4d58" }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.isCurrent
                  ? colors.current
                  : entry.total === max && max > 0
                    ? colors.high
                    : colors.base
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
