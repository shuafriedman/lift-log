"use client";

import { motion } from "motion/react";
import HandleLogin from "../handle-login";
import { Button } from "../ui/button";

// Reusable animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function Hero() {
  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-24 text-center md:py-28"
      aria-labelledby="hero-heading"
      id="overview"
    >
      <motion.h1
        id="hero-heading"
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mb-5 bg-gradient-to-r from-emerald-400 via-teal-300 to-teal-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent text-balance sm:text-5xl md:text-6xl"
      >
        Track. Improve. Dominate.
      </motion.h1>

      <motion.p
        variants={fadeUp}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.15 }}
        className="mb-8 max-w-2xl text-base text-gray-300 text-balance sm:text-lg md:text-xl"
      >
        LiftLog helps you stay consistent, visualize progress, and achieve your
        dream physique.
      </motion.p>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.3 }}
        className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:gap-5"
      >
        <HandleLogin />

        <Button
          asChild
          size="lg"
          className="bg-emerald-500 font-semibold text-black hover:bg-emerald-600"
        >
          <a href="#features">Learn More</a>
        </Button>
      </motion.div>
    </div>
  );
}
