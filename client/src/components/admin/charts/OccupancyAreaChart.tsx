"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Props = {
  data: { time: string; count: number }[];
  color?: string;
};

/** Concurrent students in session across the operating day (30-min buckets). */
export function OccupancyAreaChart({ data, color = "#22c55e" }: Props) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="occupancyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
          <XAxis
            dataKey="time"
            stroke="currentColor"
            tick={{ fontSize: 11 }}
            interval={1}
          />
          <YAxis
            stroke="currentColor"
            tick={{ fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-background-soft)",
              borderRadius: "12px",
              border: "1px solid var(--color-border)",
            }}
            formatter={(value: number) => [`${value} students`, "In session"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            fill="url(#occupancyFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
