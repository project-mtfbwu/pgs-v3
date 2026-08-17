"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsCountLink } from "@/lib/operations-analytics";

export function OperationsDistributionChart({
  caption,
  points
}: {
  caption: string;
  points: AnalyticsCountLink[];
}) {
  if (!points.length) {
    return <p className="ops:m-0 ops:text-sm ops:text-foreground">No values in this distribution yet.</p>;
  }

  return (
    <figure className="ops:m-0">
      <figcaption className="ops:sr-only">{caption}</figcaption>
      <div
        className="ops:h-48 ops:w-full"
        role="img"
        aria-label={`${caption}. ${points.map((point) => `${point.label}: ${point.count}`).join(", ")}`}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 480, height: 192 }}>
          <BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--operations-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--operations-foreground)", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--operations-foreground)", fontSize: 12 }}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "var(--operations-muted)" }}
              contentStyle={{
                background: "var(--operations-card)",
                border: "1px solid var(--operations-border)",
                borderRadius: "0.65rem",
                color: "var(--operations-card-foreground)",
                fontSize: 12
              }}
              formatter={(value) => [Number(value), "Students"]}
            />
            <Bar dataKey="count" fill="var(--operations-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="ops:mt-3 ops:m-0 ops:grid ops:grid-cols-2 ops:gap-x-4 ops:gap-y-2 ops:p-0 ops:text-sm ops:list-none">
        {points.map((point) => (
          <li key={point.key} className="ops:flex ops:justify-between ops:gap-2">
            <span>{point.label}</span>
            <strong>{point.count}</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}
