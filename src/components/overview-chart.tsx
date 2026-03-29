"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

export interface OverviewDataPoint {
  label: string;
  income: number;
  expenses: number;
}

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-sm text-sm space-y-1">
      <p className="font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name.charAt(0).toUpperCase() + p.name.slice(1)}:{" "}
          ${p.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

export function OverviewChart({ data }: { data: OverviewDataPoint[] }) {
  const hasData = data.some((d) => d.income > 0 || d.expenses > 0);
  if (!hasData) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No data available for this period.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#4e4d58" }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v: number) =>
            `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
          }
          tick={{ fontSize: 11, fill: "#4e4d58" }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ color: "#4e4d58", fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#a78bfa"  /* --accent (purple) */
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="expenses"
          stroke="#ef4444"  /* --accent3 (pink) */
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
