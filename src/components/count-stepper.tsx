"use client";

import { Minus, Plus } from "lucide-react";

/**
 * Compact +/- control for a single number (sets, reps, working weight).
 *
 * Built for cards and mid-workout rows: no text field, so the keyboard never
 * jumps up just to bump a value. The flanking buttons are 44px touch targets.
 */
export default function CountStepper({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Fractional steps (e.g. 2.5 kg plates) are rounded to 2 decimals. */
  step?: number;
  /** Rendered next to the value, e.g. "kg". */
  unit?: string;
  disabled?: boolean;
}) {
  const nudge = (direction: 1 | -1) => {
    let next = value + direction * step;
    if (max != null) next = Math.min(next, max);
    next = Math.max(next, min);
    // Avoid 72.5 + 2.5 => 75.00000000000001 on the fractional steps.
    onChange(Math.round(next * 100) / 100);
  };

  return (
    <div className="rounded-xl border border-neutral-800 p-2 text-center">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <div className="mt-1 flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label}`}
          className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-200 active:bg-neutral-800 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[2.5ch] text-xl font-bold tabular-nums">
          {value}
          {unit && (
            <span className="ml-1 text-xs font-semibold text-neutral-400">
              {unit}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={disabled || (max != null && value >= max)}
          aria-label={`Increase ${label}`}
          className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-200 active:bg-neutral-800 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
