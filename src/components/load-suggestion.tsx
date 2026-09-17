"use client";

import { Check, TrendingUp } from "lucide-react";
import {
  formatPerformance,
  formatPerformedOn,
  formatSuggestion,
  formatTarget,
  type ExerciseHistory,
} from "@/lib/load-progression";

/**
 * The "you've done this before, go heavier" prompt shown once an exercise you
 * have a history with is picked.
 *
 * It never changes the numbers on its own — the tap is the point, so a day you
 * deliberately go lighter stays one tap away from what you actually lifted.
 */
export default function LoadSuggestion({
  history,
  applied,
  onApply,
  disabled,
}: {
  history: ExerciseHistory;
  /** True once the fields already hold the suggested target. */
  applied: boolean;
  onApply: () => void;
  disabled?: boolean;
}) {
  const { last, suggestion } = history;

  return (
    <div className="space-y-2 rounded-xl border border-emerald-900 bg-emerald-950/30 p-3">
      <div className="flex items-start gap-2">
        <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {suggestion
              ? formatSuggestion(suggestion)
              : "You've logged this before"}
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">
            Last time: {formatPerformance(last)} ·{" "}
            {formatPerformedOn(last.performedAt)}
          </p>
        </div>
      </div>

      {suggestion &&
        (applied ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Set to{" "}
            {formatTarget(suggestion)}
          </p>
        ) : (
          <button
            type="button"
            onClick={onApply}
            disabled={disabled}
            className="tap-scale w-full rounded-lg border border-emerald-700 bg-emerald-600/15 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-600/25 disabled:opacity-50"
          >
            Use {formatTarget(suggestion)}
          </button>
        ))}
    </div>
  );
}
