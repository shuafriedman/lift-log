"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

/**
 * Compact +/- control for a single number (sets, reps, working weight).
 *
 * Built for cards and mid-workout rows: the flanking buttons are 44px touch
 * targets for nudging a value one step at a time, and the value itself is a
 * real input, so a jump from 20 kg to 60 kg is one typed number rather than
 * eighty taps.
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
  /** Fractional steps (e.g. 0.5 kg) are rounded to 2 decimals. */
  step?: number;
  /** Rendered next to the value, e.g. "kg". */
  unit?: string;
  disabled?: boolean;
}) {
  const decimal = !Number.isInteger(step);
  // While the field has focus the raw keystrokes win, so half-typed values
  // ("6", "62.") survive; blur hands control back to the canonical number.
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // A value changed from the outside (a refetch, a sibling edit) ends any stale
  // edit, but never one in progress. Adjusting during render rather than from an
  // effect keeps it to a single render pass, and reads component state instead
  // of poking at document.activeElement.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (!focused) setDraft(null);
  }

  const clamp = (n: number) => {
    let next = max != null ? Math.min(n, max) : n;
    next = Math.max(next, min);
    // Avoid 72.5 + 0.5 => 73.00000000000001 on the fractional steps.
    return Math.round(next * 100) / 100;
  };

  const nudge = (direction: 1 | -1) => {
    setDraft(null);
    onChange(clamp(value + direction * step));
  };

  const handleInput = (raw: string) => {
    // Keep digits (and one decimal point when the step allows fractions).
    const cleaned = decimal
      ? raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1")
      : raw.replace(/[^\d]/g, "");
    setDraft(cleaned);
    if (cleaned === "" || cleaned === ".") return;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) onChange(clamp(parsed));
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
        {/* The label fills the row so a thumb lands on it anywhere between the
            buttons, while the field itself stays snug against its unit. */}
        <label className="flex min-w-0 flex-1 cursor-text items-baseline justify-center gap-1 py-2">
          <span className="sr-only">{label}</span>
          <input
            ref={inputRef}
            value={draft ?? String(value)}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={(e) => {
              setFocused(true);
              e.target.select();
            }}
            onBlur={() => {
              setFocused(false);
              setDraft(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            disabled={disabled}
            /* Brings up the numeric keypad on Android rather than QWERTY. */
            inputMode={decimal ? "decimal" : "numeric"}
            enterKeyHint="done"
            className={`min-w-0 bg-transparent text-center text-xl font-bold tabular-nums outline-none focus:text-teal-300 disabled:opacity-40 ${
              unit ? "w-[5ch]" : "w-[3.5ch]"
            }`}
          />
          {unit && (
            <span className="shrink-0 text-xs font-semibold text-neutral-400">
              {unit}
            </span>
          )}
        </label>
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
