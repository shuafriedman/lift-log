/**
 * Load progression: what to lift next, given what you lifted last.
 *
 * Deliberately blunt. The rule is "you already did it, so go up one step" —
 * not auto-regulation, not a percentage of an estimated max. One step is the
 * smallest jump that's actually loadable in a normal gym, and work carrying no
 * weight goes up by a rep instead, because there are no kilos to add.
 */

import { exerciseKey, round1 } from "@/lib/analytics";

/** The last time an exercise was logged, as far as the suggestion cares. */
export interface LastPerformance {
  sessionId: number;
  /** ISO start date of the session the entry was logged in. */
  performedAt: string;
  sets: number | null;
  reps: number | null;
  /** Working weight in kg, null for bodyweight work. */
  weight: number | null;
}

export interface LoadSuggestion {
  /** "weight" adds kilos; "reps" is bodyweight work, so it adds a rep. */
  kind: "weight" | "reps";
  /** Target load in kg. Null on a rep suggestion. */
  weight: number | null;
  /** Target reps. Null on a weight suggestion. */
  reps: number | null;
  /** How much is being added — kg for "weight", reps for "reps". */
  step: number;
}

/** One exercise's most recent performance, plus where to take it next. */
export interface ExerciseHistory {
  /** Normalised name — the identity session entries and the library share. */
  key: string;
  /** The name as it was logged, for display. */
  name: string;
  /** Set when that last entry was logged against a My Exercises entry. */
  exerciseId: number | null;
  last: LastPerformance;
  /** Null when there's nothing to add to (no weight and no reps recorded). */
  suggestion: LoadSuggestion | null;
}

/**
 * The jump to add. Below 10 kg you're on dumbbells or a light machine where
 * 2.5 kg is a quarter of the load again, so those go up by a kilo.
 */
export function weightStep(weight: number): number {
  return weight < 10 ? 1 : 2.5;
}

/**
 * The next target after `last`. Called for every exercise that has been logged
 * at least once — one previous session is enough to earn a bump.
 */
export function suggestNextLoad(last: LastPerformance): LoadSuggestion | null {
  if (last.weight != null && last.weight > 0) {
    const step = weightStep(last.weight);
    return {
      kind: "weight",
      weight: round1(last.weight + step),
      reps: null,
      step,
    };
  }

  // No load to add — push the rep count instead.
  if (last.reps != null && last.reps > 0)
    return { kind: "reps", weight: null, reps: last.reps + 1, step: 1 };

  return null;
}

/** "3 × 10 · 30 kg" — how the last time read, in the app's usual shape. */
export function formatPerformance(p: LastPerformance): string {
  const shape =
    p.reps != null && p.reps > 0
      ? p.sets != null && p.sets > 0
        ? `${p.sets} × ${p.reps}`
        : `${p.reps} reps`
      : null;
  const load = p.weight != null && p.weight > 0 ? `${p.weight} kg` : null;
  return [shape, load].filter(Boolean).join(" · ") || "—";
}

/** "32.5 kg" / "11 reps" — the target on its own, for a button label. */
export function formatTarget(s: LoadSuggestion): string {
  return s.kind === "weight" ? `${s.weight} kg` : `${s.reps} reps`;
}

/** "Time to go up: try 32.5 kg (+2.5 kg)" — the line shown when picking. */
export function formatSuggestion(s: LoadSuggestion): string {
  const unit = s.kind === "weight" ? "kg" : s.step === 1 ? "rep" : "reps";
  return `Time to go up: try ${formatTarget(s)} (+${s.step} ${unit})`;
}

/** "Mar 3" — when the last session was, for context under the suggestion. */
export function formatPerformedOn(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.floor(
    (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Index a history payload so the picker can look an exercise up by name. */
export function historyByKey(
  history: ExerciseHistory[]
): Map<string, ExerciseHistory> {
  return new Map(history.map((h) => [h.key, h]));
}

/** The history for a name, however it was typed. Null when it's a first time. */
export function historyFor(
  byKey: Map<string, ExerciseHistory>,
  name: string | null | undefined
): ExerciseHistory | null {
  if (!name?.trim()) return null;
  return byKey.get(exerciseKey(name)) ?? null;
}
