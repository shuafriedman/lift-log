"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import LiftLogMark from "./lift-log-mark";

const navbar_content = [
  { name: "Overview", refr: "#overview" },
  { name: "Features", refr: "#features" },
  { name: "CTA", refr: "#cta" },
  { name: "Pricing", refr: "#pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  // The links are in-page anchors, so the sheet has to close itself on tap.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl pt-safe px-safe md:top-4 md:left-1/2 md:right-auto md:w-[80%] md:-translate-x-1/2 md:rounded-2xl md:border md:border-white/20 md:bg-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 md:px-6 md:py-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <LiftLogMark className="h-9 w-9 md:h-12 md:w-12" />
          <span className="tracking-tight text-white">
            Lift<span className="text-[10px]">Log</span>
          </span>
        </div>

        <div className="hidden items-center gap-5 text-xs text-gray-300 md:flex">
          {navbar_content.map((navbar_con, index) => (
            <motion.a
              key={navbar_con.name}
              href={navbar_con.refr}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.1, color: "#fff" }}
              transition={{
                delay: 0.1 * index,
                duration: 0.3,
                ease: "easeOut",
              }}
              className="transition-colors hover:text-white"
            >
              {navbar_con.name}
            </motion.a>
          ))}
        </div>

        {/* Mobile menu button — the marketing nav previously just vanished
            below `md`, so none of the sections were reachable on a phone. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="touch-target tap-scale flex items-center justify-center rounded-xl text-white md:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden md:hidden"
          >
            <ul className="flex flex-col border-t border-white/10 px-2 pb-3">
              {navbar_content.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.refr}
                    onClick={() => setOpen(false)}
                    className="tap-scale flex h-14 items-center px-3 text-base font-medium text-gray-200"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
