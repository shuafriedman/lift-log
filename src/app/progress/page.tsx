"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Flame,
  Layers,
  Scale,
  Trash2,
} from "lucide-react";
import { handleError } from "@/components/error-handle";
import LiftLogMark from "@/components/lift-log-mark";
import ConfirmSheet from "@/components/confirm-sheet";
import LogoLoading from "../logo-loading/page";
import ProgressDialog from "./progress-dialog";
import ExerciseProgress from "./exercise-progress";
import {
  chartTooltipStyle,
  compactTick,
  formatVolume,
  paddedIntDomain,
  fullDate,
  shortDate,
} from "./chart-bits";
import {
  exerciseKey,
  weeklyVolume,
  withinRange,
  type ProgressSummary,
} from "@/lib/analytics";

/** Ranges the tab can be scoped to. Null weeks means "everything". */
const RANGES = [
  { id: "4w", label: "4 weeks", weeks: 4 },
  { id: "12w", label: "12 weeks", weeks: 12 },
  { id: "all", label: "All time", weeks: null },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

export default function ProgressPage() {
  // useSearchParams needs a Suspense boundary to keep the route static-ish.
  return (
    <Suspense fallback={<LogoLoading />}>
      <ProgressView />
    </Suspense>
  );
}

function ProgressView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<RangeId>("12w");
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* Deep link: /progress?exercise=Barbell%20Bench%20Press lands straight on
     that lift's chart, so the exercise and session screens can link here. */
  const linkedExercise = searchParams.get("exercise");
  const [selectedKey, setSelectedKey] = useState<string | null>(
    linkedExercise ? exerciseKey(linkedExercise) : null
  );

  const fetchSummary = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/progress/summary");
      if (!res.ok) throw new Error("Failed to load your progress");
      const json = await res.json();
      setData(json as ProgressSummary);
    } catch (err) {
      const msg = handleError(err);
      setError(typeof msg === "string" ? msg : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const weeks = RANGES.find((r) => r.id === range)?.weeks ?? null;

  const sessions = useMemo(
    () => withinRange(data?.sessions ?? [], weeks, (s) => s.startedAt),
    [data, weeks]
  );

  // Everything hand-logged in range. The dialog accepts a calories-only entry,
  // so the list has to show rows without a weight — filtering them out saved
  // them to the database and then hid them, with no way to delete them again.
  const bodyEntries = useMemo(
    () => withinRange(data?.bodyWeight ?? [], weeks, (b) => b.date),
    [data, weeks]
  );

  // Only the weighed ones can be plotted.
  const bodyWeight = useMemo(
    () => bodyEntries.filter((b) => b.weight != null),
    [bodyEntries]
  );

  const weekly = useMemo(() => weeklyVolume(sessions, weeks), [sessions, weeks]);

  const exercises = useMemo(() => data?.exercises ?? [], [data]);

  // Default to the most recently trained lift so the section is never empty.
  const selected =
    exercises.find((e) => e.key === selectedKey) ?? exercises[0] ?? null;

  // Totals for the header stats, scoped to the chosen range.
  const totals = useMemo(() => {
    const volume = sessions.reduce((sum, s) => sum + s.volume, 0);
    const days = new Set(
      sessions.map((s) => new Date(s.startedAt).toDateString())
    ).size;
    return {
      sessions: sessions.length,
      volume,
      days,
      sets: sessions.reduce((sum, s) => sum + s.setCount, 0),
    };
  }, [sessions]);

  const deleteEntry = async () => {
    if (pendingDelete == null) return;
    try {
      setDeleting(true);
      const res = await fetch("/api/progress", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDelete }),
      });
      if (!res.ok) throw new Error("Failed to delete entry");
      await fetchSummary();
    } catch (err) {
      const msg = handleError(err);
      setError(typeof msg === "string" ? msg : "An error occurred.");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const selectExercise = (key: string) => {
    setSelectedKey(key);
    // Keep the URL shareable/bookmarkable without pushing history entries.
    const next = exercises.find((e) => e.key === key);
    if (next) {
      router.replace(`/progress?exercise=${encodeURIComponent(next.name)}`, {
        scroll: false,
      });
    }
  };

  if (loading) return <LogoLoading />;

  const hasTraining = (data?.sessions.length ?? 0) > 0;

  return (
    <div className="px-4 py-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center gap-3">
          <LiftLogMark className="h-10 w-10 shrink-0 md:h-14 md:w-14" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold md:text-3xl">
              My Progress
            </h1>
            <p className="text-sm text-neutral-400">
              {data?.sessions.length ?? 0}{" "}
              {data?.sessions.length === 1 ? "session" : "sessions"} ·{" "}
              {exercises.length}{" "}
              {exercises.length === 1 ? "exercise" : "exercises"} tracked
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border-2 border-red-800 p-4">
            <Dumbbell className="h-5 w-5 shrink-0 text-red-500" />
            <p className="font-medium text-red-500">{error}</p>
          </div>
        )}

        {!hasTraining && bodyEntries.length === 0 && !error ? (
          <EmptyState />
        ) : (
          <>
            {/* Range switch. Every chart below reads from it. */}
            <div className="mb-5 flex gap-2 rounded-2xl border border-neutral-800/70 p-1">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`tap-scale h-10 flex-1 rounded-xl text-sm font-semibold transition-colors ${
                    range === r.id
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 active:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={<Dumbbell className="h-4 w-4" />}
                title="Sessions"
                value={totals.sessions}
              />
              <StatCard
                icon={<Layers className="h-4 w-4" />}
                title="Volume"
                value={formatVolume(totals.volume)}
              />
              <StatCard
                icon={<CalendarDays className="h-4 w-4" />}
                title="Training days"
                value={totals.days}
              />
              <StatCard
                icon={<Flame className="h-4 w-4" />}
                title="Streak"
                value={`${data?.streak ?? 0}d`}
              />
            </div>

            {/* Volume over time — the headline "am I doing more work" chart. */}
            <Section
              title="Training volume"
              hint="kg lifted per week"
              className="mb-5"
            >
              {weekly.length > 0 ? (
                <div className="h-52 w-full md:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weekly}
                      margin={{ top: 6, right: 4, bottom: 0, left: -6 }}
                    >
                      <defs>
                        <linearGradient id="weekVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2dd4bf" />
                          <stop offset="100%" stopColor="#0f766e" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="#262626"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#737373"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        minTickGap={12}
                      />
                      <YAxis
                        stroke="#737373"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        width={38}
                        tickFormatter={compactTick}
                      />
                      <Tooltip {...chartTooltipStyle} />
                      <Bar
                        dataKey="volume"
                        name="Volume (kg)"
                        fill="url(#weekVolume)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Placeholder text="No sessions in this range." />
              )}
            </Section>

            {/* Per-exercise progress — the reason this tab exists. */}
            <Section
              title="Exercise progress"
              hint={selected ? selected.name : undefined}
              className="mb-5"
            >
              {exercises.length === 0 ? (
                <Placeholder text="Log an exercise in a session to start a history." />
              ) : (
                <>
                  <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {exercises.map((ex) => (
                      <button
                        key={ex.key}
                        onClick={() => selectExercise(ex.key)}
                        className={`tap-scale h-10 shrink-0 rounded-xl border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                          selected?.key === ex.key
                            ? "border-teal-500 bg-teal-950/60 text-teal-200"
                            : "border-neutral-800 text-neutral-400"
                        }`}
                      >
                        {ex.name}
                        <span className="ml-1.5 text-xs font-normal opacity-60">
                          ×{ex.timesPerformed}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selected && <ExerciseProgress series={selected} />}
                </>
              )}
            </Section>

            {/* Body weight — the hand-logged half of "progress". */}
            <Section
              title="Body weight"
              hint="kg"
              className="mb-5"
              action={<ProgressDialog onsuccess={fetchSummary} />}
            >
              {bodyEntries.length === 0 ? (
                <Placeholder text="Nothing logged in this range yet." />
              ) : (
                <>
                  {bodyWeight.length > 0 ? (
                  <div className="h-48 w-full md:h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={bodyWeight.map((b) => ({
                          date: shortDate(b.date),
                          weight: b.weight,
                        }))}
                        margin={{ top: 6, right: 8, bottom: 0, left: -2 }}
                      >
                        <CartesianGrid
                          stroke="#262626"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="#737373"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                          minTickGap={16}
                        />
                        <YAxis
                          stroke="#737373"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                          width={38}
                          tickFormatter={compactTick}
                          domain={paddedIntDomain(2)}
                        />
                        <Tooltip {...chartTooltipStyle} />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          name="Body weight (kg)"
                          stroke="#5eead4"
                          strokeWidth={2.5}
                          dot={{ r: bodyWeight.length < 2 ? 5 : 3, fill: "#5eead4" }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <Placeholder text="No weigh-ins in this range — only calories." />
                  )}

                  <ul className="mt-4 divide-y divide-neutral-800/70">
                    {[...bodyEntries].reverse().map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <Scale className="h-4 w-4 shrink-0 text-neutral-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {fullDate(entry.date)}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {[
                              entry.weight != null ? `${entry.weight} kg` : null,
                              entry.caloriesBurned != null
                                ? `${entry.caloriesBurned} kcal`
                                : null,
                              entry.workout,
                            ]
                              .filter(Boolean)
                              .join("  ·  ")}
                          </p>
                        </div>
                        <button
                          onClick={() => setPendingDelete(entry.id)}
                          className="touch-target tap-scale flex shrink-0 items-center justify-center rounded-xl text-neutral-500 active:text-red-400"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>

            {/* Session history — one row per session, not one per exercise. */}
            <Section title="Sessions" hint={`${sessions.length} in range`}>
              {sessions.length === 0 ? (
                <Placeholder text="No sessions in this range." />
              ) : (
                <ul className="space-y-2">
                  {[...sessions].reverse().map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/sessions/${s.id}`}
                        className="tap-scale flex items-center gap-3 rounded-xl border border-neutral-800 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {s.name ?? fullDate(s.startedAt)}
                          </p>
                          <p className="truncate text-xs text-neutral-400">
                            {[
                              s.name ? shortDate(s.startedAt) : null,
                              `${s.exerciseCount} ${
                                s.exerciseCount === 1 ? "exercise" : "exercises"
                              }`,
                              s.setCount > 0 ? `${s.setCount} sets` : null,
                              s.volume > 0 ? formatVolume(s.volume) : null,
                              s.durationMin != null
                                ? `${s.durationMin} min`
                                : "In progress",
                            ]
                              .filter(Boolean)
                              .join("  ·  ")}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </div>

      <ConfirmSheet
        open={pendingDelete !== null}
        title="Delete this entry?"
        body="This action cannot be undone."
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteEntry}
      />
    </div>
  );
}

function Section({
  title,
  hint,
  action,
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-neutral-800/70 p-4 shadow-lift-gradient backdrop-blur-xl md:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
        {hint && (
          <span className="truncate text-xs text-neutral-500">{hint}</span>
        )}
      </div>
      {children}
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800/70 p-3 shadow-lift-gradient backdrop-blur-xl md:p-4">
      <div className="mb-1 flex items-center gap-1.5 text-neutral-400">
        {icon}
        <h3 className="truncate text-xs md:text-sm">{title}</h3>
      </div>
      <p className="text-xl font-bold text-lift-gradient md:text-2xl">{value}</p>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-neutral-400">{text}</p>;
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-neutral-800 px-6 py-10 text-center">
      <Dumbbell className="mx-auto mb-4 h-12 w-12 text-neutral-500" />
      <h3 className="mb-2 text-xl font-bold">Nothing to chart yet</h3>
      <p className="mx-auto mb-5 max-w-md text-sm text-neutral-400">
        Progress is built from your sessions. Finish one and this tab fills in
        with your volume per week and a history for every exercise you logged.
      </p>
      <Link
        href="/sessions"
        className="tap-scale inline-flex h-12 items-center rounded-xl bg-emerald-600 px-5 font-semibold text-white"
      >
        Start a session
      </Link>
    </div>
  );
}
