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

export function MerchantsChart({
  data,
  accent = "red",
}: {
  data: SpendingStats["topMerchants"];
  accent?: "green" | "red";
}) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No merchant data found.
      </p>
    );
  }

  // Colors match Vault design tokens: --accent3 (pink) for expenses, --accent (purple) for income
  const colors = accent === "red"
    ? { top: "#ef4444", mid: "#dc2626", rest: "#7f1d1d" }   /* --accent3 pink */
    : { top: "#a78bfa", mid: "#7c3aed", rest: "#4c1d95" };  /* --accent purple */

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          tick={{ fontSize: 11, fill: "#4e4d58" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="merchant"
          width={110}
          tick={{ fontSize: 12, fill: "#4e4d58" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {data.map((_entry, i) => (
            <Cell
              key={i}
              fill={i === 0 ? colors.top : i === 1 ? colors.mid : colors.rest}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
