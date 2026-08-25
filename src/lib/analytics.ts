/**
 * Progress maths, shared by the /api/progress/summary route and the Progress
 * tab so the server and the chart can never disagree about what "volume" means.
 *
 * Everything here is pure and unit-agnostic beyond kg, which is what the app
 * stores throughout.
 */

/** One logged exercise inside a session, as far as the maths cares. */
export interface EntryLike {
  name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  exerciseId?: number | null;
  catalogId?: string | null;
}

/** Total reps performed: sets × reps. Bodyweight work still counts here. */
export function entryReps(e: EntryLike): number {
  return (e.sets ?? 0) * (e.reps ?? 0);
}

/** Tonnage moved: sets × reps × kg. Zero when the lift carries no weight. */
export function entryVolume(e: EntryLike): number {
  if (e.weight == null) return 0;
  return round1(entryReps(e) * e.weight);
}

/**
 * Estimated one-rep max (Epley). A single number that folds weight and reps
 * together, so 60 kg × 10 reading as stronger than 65 kg × 3 shows up as
 * progress rather than as a drop in top-set weight.
 */
export function estimatedOneRepMax(
  weight: number | null,
  reps: number | null
): number | null {
  if (weight == null || weight <= 0) return null;
  const r = reps ?? 1;
  if (r <= 1) return round1(weight);
  return round1(weight * (1 + r / 30));
}

/**
 * Identity for grouping the same lift across sessions. Session entries snapshot
 * their name, and the same exercise can arrive from the library, the catalog or
 * free-hand typing — so the normalised name is the one key all three share.
 */
export function exerciseKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Local midnight of the Sunday that starts this date's week. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Local midnight, so a session never lands on the previous day via UTC. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "2026-08-25" in local time — safe as an object key and as a chart label. */
export function dayKey(date: Date): string {
  const d = startOfDay(date);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/* ------------------------------------------------------------------ */
/* Wire types — what /api/progress/summary returns.                     */
/* ------------------------------------------------------------------ */

export interface SessionSummary {
  id: number;
  name: string | null;
  startedAt: string;
  endedAt: string | null;
  /** Null while the session is still running. */
  durationMin: number | null;
  exerciseCount: number;
  setCount: number;
  totalReps: number;
  volume: number;
  /** Heaviest single load touched in the session, in kg. */
  topWeight: number | null;
  entries: { name: string; sets: number | null; reps: number | null; weight: number | null }[];
}

/** One session's worth of a single exercise. */
export interface ExercisePoint {
  sessionId: number;
  date: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  volume: number;
  oneRepMax: number | null;
}

export interface ExerciseSeries {
  key: string;
  name: string;
  /** Oldest → newest, one point per session the exercise appeared in. */
  points: ExercisePoint[];
  timesPerformed: number;
  bestWeight: number | null;
  bestOneRepMax: number | null;
  bestVolume: number;
  lastPerformed: string;
  /** kg gained on the top set since the first logged session. Null with < 2 points. */
  weightDelta: number | null;
}

export interface BodyWeightPoint {
  id: number;
  date: string;
  weight: number | null;
  caloriesBurned: number | null;
  workout: string | null;
}

export interface ProgressSummary {
  streak: number;
  sessions: SessionSummary[];
  exercises: ExerciseSeries[];
  bodyWeight: BodyWeightPoint[];
}

/* ------------------------------------------------------------------ */
/* Client-side shaping.                                                 */
/* ------------------------------------------------------------------ */

export interface WeekBucket {
  weekStart: string;
  label: string;
  sessions: number;
  volume: number;
  sets: number;
}

/**
 * Volume per calendar week, with empty weeks filled in. Gaps are the signal —
 * a line that skips the fortnight you missed reads as continuous training.
 */
export function weeklyVolume(
  sessions: SessionSummary[],
  weeks: number | null
): WeekBucket[] {
  if (sessions.length === 0) return [];

  const buckets = new Map<string, WeekBucket>();
  const label = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  for (const s of sessions) {
    const start = startOfWeek(new Date(s.startedAt));
    const key = dayKey(start);
    const bucket = buckets.get(key) ?? {
      weekStart: key,
      label: label(start),
      sessions: 0,
      volume: 0,
      sets: 0,
    };
    bucket.sessions += 1;
    bucket.volume = round1(bucket.volume + s.volume);
    bucket.sets += s.setCount;
    buckets.set(key, bucket);
  }

  const first = startOfWeek(
    new Date(
      Math.min(...sessions.map((s) => new Date(s.startedAt).getTime()))
    )
  );
  const cursor = weeks
    ? new Date(
        Math.max(
          first.getTime(),
          startOfWeek(new Date()).getTime() - (weeks - 1) * 7 * 86400000
        )
      )
    : first;
  const end = startOfWeek(new Date());

  const out: WeekBucket[] = [];
  while (cursor <= end) {
    const key = dayKey(cursor);
    out.push(
      buckets.get(key) ?? {
        weekStart: key,
        label: label(cursor),
        sessions: 0,
        volume: 0,
        sets: 0,
      }
    );
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

/** Keep only what falls inside the last `weeks` weeks. Null means everything. */
export function withinRange<T>(
  items: T[],
  weeks: number | null,
  getDate: (item: T) => string
): T[] {
  if (weeks == null) return items;
  const cutoff = startOfWeek(new Date());
  cutoff.setDate(cutoff.getDate() - (weeks - 1) * 7);
  return items.filter((i) => new Date(getDate(i)) >= cutoff);
}
