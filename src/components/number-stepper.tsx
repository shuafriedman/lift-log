"use client";

import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A number field with real, thumb-sized increment controls.
 *
 * The dialogs used to stack a ▲ and a ▼ inside the input's right edge — two
 * ~23×24px targets, roughly half the 44px minimum, sitting on top of the field
 * you are trying to type into. Here the controls flank the input at full
 * height, so a mis-tap lands on a button rather than between two.
 */
export default function NumberStepper({
  id,
  label,
  icon,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  placeholder,
  disabled,
  decimal = false,
  onKeyDown,
}: {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (next: string) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  /** Use the decimal keypad and keep fractional precision (e.g. body weight). */
  decimal?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}) {
  const nudge = (direction: 1 | -1) => {
    const current = parseFloat(value);
    const base = Number.isFinite(current) ? current : min;
    let next = base + direction * step;
    if (max != null) next = Math.min(next, max);
    next = Math.max(next, min);
    // Avoid 72.5 + 0.5 => 73.00000000000001 on the decimal fields.
    onChange(decimal ? String(Math.round(next * 100) / 100) : String(next));
  };

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="flex items-center gap-1 text-sm font-semibold text-white"
      >
        {icon}
        {label}
      </Label>

      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={disabled}
          aria-label={`Decrease ${label}`}
          className="tap-scale flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-neutral-800 text-neutral-200 active:bg-neutral-800 disabled:opacity-50"
        >
          <Minus className="h-5 w-5" />
        </button>

        <Input
          id={id}
          type="number"
          /* Brings up the numeric keypad on Android rather than QWERTY. */
          inputMode={decimal ? "decimal" : "numeric"}
          enterKeyHint="done"
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          className="h-12 min-w-0 flex-1 rounded-xl border-2 border-neutral-800 bg-neutral-950 text-center text-lg font-semibold text-white shadow-sm focus:border-neutral-200"
        />

        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={disabled}
          aria-label={`Increase ${label}`}
          className="tap-scale flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-neutral-800 text-neutral-200 active:bg-neutral-800 disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
