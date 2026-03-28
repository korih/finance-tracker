"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { IncomeBreakdownEntry } from "@/lib/income";

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { value: number }[];
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

export function IncomeChart({ data }: { data: IncomeBreakdownEntry[] }) {
  if (data.every((d) => d.total === 0)) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No income entries found.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.total));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v: number) =>
            `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
          }
          tick={{ fontSize: 11 }}
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
                  ? "#4BAF82"
                  : entry.total === max && max > 0
                    ? "#7DCAAA"
                    : "#B8E4D2"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
