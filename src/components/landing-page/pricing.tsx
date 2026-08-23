"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "/forever",
    features: [
      "Log workouts",
      "Custom routines",
      "Track height & weight",
      "View streaks",
      "Dashboard analytics",
    ],
  },
  {
    name: "Pro",
    price: "₹149",
    period: "/month",
    highlight: true,
    features: [
      "Everything in Free",
      "Advanced progress insights",
      "Detailed trend analytics",
      "Calorie burn estimation",
      "Priority updates + new features",
    ],
  },
];

export default function Pricing() {
  return (
    <section className="relative px-1 py-16 md:py-24" id="pricing">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_40%_at_50%_5%,rgba(94,234,212,0.18),transparent_70%)]" />

      <div className="mx-auto mb-10 max-w-6xl px-5 text-center md:mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl font-bold tracking-tight text-balance sm:text-3xl md:text-4xl"
        >
          Simple, clear{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-teal-500 bg-clip-text text-transparent">
            pricing
          </span>
          .
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-3 text-white/70"
        >
          Start free. Upgrade only when you feel the need.
        </motion.p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 px-5 md:grid-cols-2 md:gap-8">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.05, ease: "easeOut" }}
            viewport={{ once: true }}
            className={`relative rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-md p-8 shadow-xl ${
              plan.highlight ? "ring-2 ring-emerald-400/60" : ""
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-400 to-teal-500 text-black text-xs font-semibold px-2 py-1 rounded-lg">
                Most Popular
              </span>
            )}

            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-white/60 mb-1">{plan.period}</span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-white/70">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              className={`mt-8 h-12 w-full rounded-xl font-semibold transition ${
                plan.highlight
                  ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-black hover:opacity-90"
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
              }`}
            >
              {plan.highlight ? "Upgrade to Pro" : "Get Started"}
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
