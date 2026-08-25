"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { ExerciseSeries } from "@/lib/analytics";
import {
  chartTooltipStyle,
  compactTick,
  formatKg,
  paddedIntDomain,
  shortDate,
} from "./chart-bits";

/**
 * One lift's history: top-set weight and estimated 1RM as lines, tonnage as
 * bars behind them. This is the "am I actually getting stronger at bench press"
 * view — the one thing a list of session cards can never answer.
 */
export default function ExerciseProgress({
  series,
}: {
  series: ExerciseSeries;
}) {
  const data = useMemo(
    () =>
      series.points.map((p) => ({
        date: shortDate(p.date),
        weight: p.weight,
        oneRepMax: p.oneRepMax,
        volume: p.volume,
        detail:
          p.sets != null && p.reps != null ? `${p.sets} × ${p.reps}` : "—",
      })),
    [series]
  );

  const single = data.length < 2;

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Best weight" value={formatKg(series.bestWeight)} />
        <Metric label="Best est. 1RM" value={formatKg(series.bestOneRepMax)} />
        <Metric label="Sessions" value={String(series.timesPerformed)} />
        <Metric
          label="Change"
          value={
            series.weightDelta == null
              ? "—"
              : `${series.weightDelta > 0 ? "+" : ""}${series.weightDelta} kg`
          }
          trend={
            series.weightDelta == null
              ? null
              : series.weightDelta > 0
                ? "up"
                : series.weightDelta < 0
                  ? "down"
                  : "flat"
          }
        />
      </div>

      <div className="h-56 w-full md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#0d9488" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#737373"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              minTickGap={16}
            />
            <YAxis
              yAxisId="kg"
              stroke="#737373"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={44}
              tickFormatter={compactTick}
              domain={paddedIntDomain(5)}
            />
            <YAxis yAxisId="vol" orientation="right" hide />
            <Tooltip {...chartTooltipStyle} />

            {/* Tonnage sits behind as context: a heavier top set at fewer sets
                is a different kind of session, and the bars show that. */}
            <Bar
              yAxisId="vol"
              dataKey="volume"
              name="Volume (kg)"
              fill="url(#volumeFill)"
              radius={[6, 6, 0, 0]}
              maxBarSize={38}
            />
            <Line
              yAxisId="kg"
              type="monotone"
              dataKey="weight"
              name="Top set (kg)"
              stroke="#2dd4bf"
              strokeWidth={2.5}
              dot={{ r: single ? 5 : 3, fill: "#2dd4bf" }}
              connectNulls
            />
            <Line
              yAxisId="kg"
              type="monotone"
              dataKey="oneRepMax"
              name="Est. 1RM (kg)"
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: single ? 4 : 2, fill: "#a78bfa" }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {single && (
        <p className="mt-2 text-center text-xs text-neutral-500">
          One session logged so far — log {series.name} again and the trend line
          starts here.
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat" | null;
}) {
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <div className="rounded-xl border border-neutral-800/70 p-2.5">
      <p className="truncate text-[11px] text-neutral-400">{label}</p>
      <p className="flex items-center gap-1 text-base font-bold text-lift-gradient md:text-lg">
        {trend && <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />}
        {value}
      </p>
    </div>
  );
}
