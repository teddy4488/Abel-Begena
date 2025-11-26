"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Props = {
  data: { label: string; total: number }[];
  color?: string;
};

export function AnalyticsLineChart({ data, color = "#c084fc" }: Props) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="label" stroke="currentColor" />
          <YAxis stroke="currentColor" />
          <Tooltip
            contentStyle={{
              background: "var(--color-background-soft)",
              borderRadius: "12px",
              border: "1px solid var(--color-border)",
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke={color}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, stroke: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

