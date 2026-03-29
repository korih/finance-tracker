"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export interface CategoryTotal {
  name: string;
  color: string;
  total: number;
  pct: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: CategoryTotal }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-sm text-sm space-y-0.5">
      <p className="font-medium">{d.name}</p>
      <p className="text-muted-foreground">
        ${d.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        <span className="ml-2 text-xs">({d.pct}%)</span>
      </p>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; payload: CategoryTotal }> }) {
  if (!payload?.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
      {payload.map((entry) => (
        <li key={entry.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.payload.color }}
          />
          {entry.value}
        </li>
      ))}
    </ul>
  );
}

export function CategoryPieChart({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No categorized spending for this period.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
