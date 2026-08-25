"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUserStore } from "@/store/userStore";
import { authClient } from "@/lib/auth-client";
import { motion } from "framer-motion";
import { Flame, Play, TrendingUp, CalendarCheck, Scale } from "lucide-react";

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

import LogoLoading from "../logo-loading/page";

import {
  dayKey,
  startOfWeek,
  round1,
  type ProgressSummary,
} from "@/lib/analytics";

export default function Dashboard() {
  const setUser = useUserStore((state) => state.setUser);

  const [userName, setUserName] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Fetch session
        const { data: session } = await authClient.getSession();
        if (session?.user) {
          const mappedUser = {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image ?? undefined,
          };

          setUser(mappedUser);
          setUserName(mappedUser.name ?? "User");
          localStorage.setItem("user", JSON.stringify(mappedUser));
        }

        // One roll-up for the whole dashboard: sessions, per-exercise history,
        // body weight and streak. A phone loses signal mid-set all the time, so
        // read defensively rather than blowing the page up.
        const res = await fetch("/api/progress/summary");
        if (res.ok) {
          const data = await res.json();
          setSummary({
            streak: data?.streak ?? 0,
            sessions: Array.isArray(data?.sessions) ? data.sessions : [],
            exercises: Array.isArray(data?.exercises) ? data.exercises : [],
            bodyWeight: Array.isArray(data?.bodyWeight) ? data.bodyWeight : [],
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [setUser]);

  if (loading) return <LogoLoading />;

  const sessions = summary?.sessions ?? [];
  const bodyWeight = summary?.bodyWeight ?? [];

  // Stats. Volume is the honest "how much work" number — sets × reps × kg,
  // summed over every exercise in every session.
  const totalVolume = round1(sessions.reduce((sum, s) => sum + s.volume, 0));
  const latestWeight =
    [...bodyWeight].reverse().find((b) => b.weight != null)?.weight ?? null;
  const trainingDays = new Set(
    sessions.map((s) => new Date(s.startedAt).toDateString())
  ).size;

  // This week only (Sun → Sat), with each day's session volume and any body
  // weight logged that day.
  const weekStart = startOfWeek(new Date());
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyDailyData = weekdays.map((day, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return { day, key: dayKey(d), volume: 0, weight: null as number | null };
  });
  const slotFor = (iso: string) =>
    weeklyDailyData.find((slot) => slot.key === dayKey(new Date(iso)));

  sessions.forEach((s) => {
    const slot = slotFor(s.startedAt);
    if (slot) slot.volume = round1(slot.volume + s.volume);
  });
  bodyWeight.forEach((b) => {
    const slot = slotFor(b.date);
    if (slot && b.weight != null) slot.weight = b.weight;
  });

  const hasWeekData = weeklyDailyData.some((d) => d.volume > 0 || d.weight);

  return (
    <motion.div
      className="px-4 py-5 md:p-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <p className="text-sm text-neutral-400">Welcome back</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {userName ?? "Athlete"}
          </h1>
        </header>

        {/* The one thing you open this app to do. Full width, thumb-sized. */}
        <Link
          href="/sessions"
          className="tap-scale mb-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-semibold text-white shadow-lg shadow-emerald-900/40 active:bg-emerald-700"
        >
          <Play className="h-5 w-5" />
          Start a session
        </Link>

        {/* Stats — two up on a phone, four across from `sm`. */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            title="Volume"
            value={
              totalVolume >= 10000
                ? `${round1(totalVolume / 1000)}t`
                : `${Math.round(totalVolume).toLocaleString()} kg`
            }
          />
          <StatCard
            icon={<Scale className="h-4 w-4" />}
            title="Body weight"
            value={latestWeight != null ? `${latestWeight} kg` : "—"}
          />
          <StatCard
            icon={<CalendarCheck className="h-4 w-4" />}
            title="Training days"
            value={trainingDays}
          />
          <StatCard
            icon={<Flame className="h-4 w-4" />}
            title="Streak"
            value={`${summary?.streak ?? 0}d`}
          />
        </div>

        {/* Weekly chart */}
        <motion.section
          className="rounded-2xl border border-neutral-800/70 p-4 shadow-lift-gradient backdrop-blur-xl md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold md:text-xl">This week</h2>
            <span className="text-xs text-neutral-500">
              volume · body weight (kg)
            </span>
          </div>

          {hasWeekData ? (
            /* Shorter on a phone so the chart plus a stat row fit one screen. */
            <div className="h-56 w-full md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={weeklyDailyData}
                  margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
                >
                  <CartesianGrid
                    stroke="#262626"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="#737373"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    /* One letter per day fits 360px without overlapping. */
                    tickFormatter={(d: string) => d.slice(0, 1)}
                  />
                  <YAxis
                    yAxisId="vol"
                    stroke="#737373"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    width={38}
                  />
                  <YAxis
                    yAxisId="kg"
                    orientation="right"
                    stroke="#737373"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    width={30}
                    domain={["dataMin - 2", "dataMax + 2"]}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "rgba(10, 10, 10, 0.95)",
                      border: "1px solid rgba(45, 212, 191, 0.3)",
                      borderRadius: "12px",
                      fontSize: "13px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />

                  <Bar
                    yAxisId="vol"
                    dataKey="volume"
                    name="Volume (kg)"
                    animationDuration={700}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={34}
                    fill="url(#tealGradient)"
                  />

                  {/* Body weight lives on its own axis — as a bar next to a
                      500-calorie bar it was a one-pixel stub. */}
                  <Line
                    yAxisId="kg"
                    type="monotone"
                    dataKey="weight"
                    name="Weight (kg)"
                    stroke="#5eead4"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#5eead4" }}
                    connectNulls
                  />

                  <defs>
                    <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" />
                      <stop offset="100%" stopColor="#0f766e" />
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-neutral-400">
                No sessions this week yet.
              </p>
              <Link
                href="/progress"
                className="mt-3 inline-flex h-11 items-center rounded-xl border border-neutral-700 px-4 text-sm font-semibold"
              >
                See your progress
              </Link>
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
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
