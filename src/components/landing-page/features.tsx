"use client";

import { motion } from "motion/react";
import {
  Dumbbell,
  Clock3,
  CalendarCheck,
  Scale,
  Ruler,
  Flame,
  BarChart3,
  LineChart,
  Trophy
} from "lucide-react";

const FEATURES = [
  {
    title: "Custom Workout Routines",
    desc: "Build plans that match your goals and training style.",
    Icon: Dumbbell,
  },
  {
    title: "Session Logging",
    desc: "Start, end, and track duration, sets, reps, and weights—fast.",
    Icon: Clock3,
  },
  {
    title: "Consistency Streaks",
    desc: "Stay accountable with daily/weekly streak tracking.",
    Icon: CalendarCheck,
  },
  {
    title: "Height & Weight",
    desc: "Update body metrics anytime to keep progress accurate.",
    Icon: Ruler,
  },
  {
    title: "Gain/Loss Trends",
    desc: "See bodyweight trends over time—clear and visual.",
    Icon: Scale,
  },
  {
    title: "Avg Workout Time",
    desc: "Understand your typical session length at a glance.",
    Icon: BarChart3,
  },
  {
    title: "Calories Burned (Est.)",
    desc: "Get smart estimates of calories burned per session.",
    Icon: Flame,
  },
  {
    title: "Dashboard Analytics",
    desc: "Insights, charts, and progress in one focused view.",
    Icon: LineChart,
  },
  {
    title: "Personal Best Tracking",
    desc: "Automatically track PRs for every exercise and celebrate new records.",
    Icon: Trophy,
  }
];

export default function Features() {
  return (
    <section className="relative px-1 py-16 md:py-24" id="features">
      {/* subtle gradient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(94,234,212,0.15),transparent_60%)]" />

      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-14"
        >
          <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl md:text-4xl">
            Train smarter with{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-teal-500 bg-clip-text text-transparent">
              LiftLog
            </span>
          </h2>
          <p className="mt-3 text-white/70">
            Log. Analyze. Stay consistent. Turn effort into visible progress.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map(({ title, desc, Icon }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.04, ease: "easeOut" }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl p-[1px] bg-gradient-to-br from-emerald-500/30 via-teal-400/20 to-teal-500/30"
            >
              <div className="rounded-2xl h-full bg-zinc-900/70 backdrop-blur-sm p-5 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2 bg-white/5 border border-white/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                </div>
                <p className="mt-3 text-sm text-white/70">{desc}</p>

                {/* subtle underline accent on hover */}
                <div className="mt-4 h-px w-0 bg-gradient-to-r from-emerald-400 via-teal-300 to-teal-500 transition-all duration-300 group-hover:w-full" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
