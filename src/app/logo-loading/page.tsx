"use client";

import { motion } from "motion/react";
import LiftLogMark from "@/components/lift-log-mark";

export default function LogoLoading() {
  return (
    // `dvh`, not `vh`: on Android the visible area shrinks when the URL bar is
    // showing, and a `100vh` splash pushes the mark below the fold.
    <div className="flex min-h-[60dvh] items-center justify-center bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: "easeOut",
        }}
      >
        <LiftLogMark className="h-24 w-24" />
      </motion.div>
    </div>
  );
}
