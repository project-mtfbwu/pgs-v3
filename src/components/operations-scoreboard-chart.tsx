"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScoreboardJoinTrendPoint } from "@/lib/operations-scoreboard";

export function OperationsJoinTrendChart({
  points
}: {
  points: ScoreboardJoinTrendPoint[];
}) {
  if (!points.length || points.every((point) => point.count === 0)) {
    return (
      <p className="ops:m-0 ops:text-sm ops:text-muted-foreground">
        No students joined during the last six calendar months.
      </p>
    );
  }

  return (
    <figure className="ops:m-0" aria-labelledby="student-join-trend-caption">
      <figcaption id="student-join-trend-caption" className="ops:sr-only">
        Student joins for the last six India-time calendar months.
      </figcaption>
      <div
        className="ops:h-56 ops:w-full"
        role="img"
        aria-label={`Student joins for the last six India-time calendar months. ${points.map((point) => `${point.month}: ${point.count}`).join(", ")}`}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 640, height: 224 }}
        >
          <BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--operations-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--operations-muted-foreground)", fontSize: 12 }}
              tickFormatter={(value: string) => value.split(" ")[0]}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--operations-muted-foreground)", fontSize: 12 }}
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
              formatter={(value) => [Number(value), "Students joined"]}
            />
            <Bar dataKey="count" fill="var(--operations-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="ops:mt-3 ops:grid ops:grid-cols-2 ops:gap-x-4 ops:gap-y-2 ops:p-0 ops:text-xs ops:list-none ops:sm:grid-cols-3">
        {points.map((point) => (
          <li key={point.monthStart} className="ops:flex ops:justify-between ops:gap-2">
            <span className="ops:text-muted-foreground">{point.month}</span>
            <strong>{point.count}</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}
