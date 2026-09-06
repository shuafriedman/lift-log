/**
 * Search, filter and sort helpers for My Exercises.
 *
 * Kept out of the page component (and free of React) so the list logic is one
 * pure function over the fetched array: the page only owns the controls.
 */

export interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  /** Working weight in kg. Null for bodyweight exercises. */
  weight?: number | null;
  category: string;
  createdAt: string;
  updatedAt: string;
  /** Set when the user has taken their own photo for this exercise. */
  photoUpdatedAt?: string | null;
  catalog?: {
    id: string;
    images: string[];
    category: string | null;
    equipment: string | null;
    primaryMuscles: string[];
    level: string | null;
  } | null;
}

export type SortKey = "recent" | "name" | "weight" | "volume" | "updated";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently added" },
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name (A–Z)" },
  { value: "weight", label: "Heaviest weight" },
  { value: "volume", label: "Most volume" },
];

export const SORT_LABELS: Record<SortKey, string> = Object.fromEntries(
  SORT_OPTIONS.map((o) => [o.value, o.label])
) as Record<SortKey, string>;

export function isSortKey(value: unknown): value is SortKey {
  return SORT_OPTIONS.some((o) => o.value === value);
}

/** Tonnage moved for one round of the prescription: sets × reps × kg. */
export function tonnage(ex: Exercise) {
  return (ex.sets || 0) * (ex.reps || 0) * (ex.weight ?? 0);
}

/** Total reps prescribed: sets × reps. */
export function repVolume(ex: Exercise) {
  return (ex.sets || 0) * (ex.reps || 0);
}

/**
 * The muscle groups an exercise is filed under. Catalog exercises carry real
 * muscle data; a custom one only has its free-text category, which is better
 * than dropping it out of the filters entirely.
 */
export function muscleTags(ex: Exercise): string[] {
  const fromCatalog = ex.catalog?.primaryMuscles ?? [];
  if (fromCatalog.length > 0) return fromCatalog.map((m) => m.toLowerCase());
  const fallback = ex.catalog?.category ?? ex.category;
  return fallback ? [fallback.toLowerCase()] : [];
}

/** Muscle groups present in the list, most-used first, for the filter chips. */
export function muscleFacets(
  exercises: Exercise[]
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const ex of exercises) {
    for (const tag of new Set(muscleTags(ex))) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** Everything a search term is allowed to match, lowercased once per item. */
function haystack(ex: Exercise): string {
  return [
    ex.name,
    ex.category,
    ex.catalog?.category,
    ex.catalog?.equipment,
    ex.catalog?.level,
    ...(ex.catalog?.primaryMuscles ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Every whitespace-separated term must match, so "db press" narrows twice. */
function matchesQuery(ex: Exercise, terms: string[]) {
  if (terms.length === 0) return true;
  const text = haystack(ex);
  return terms.every((term) => text.includes(term));
}

const byName = (a: Exercise, b: Exercise) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

const byDate = (a?: string, b?: string) =>
  new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime();

const COMPARATORS: Record<SortKey, (a: Exercise, b: Exercise) => number> = {
  recent: (a, b) => byDate(a.createdAt, b.createdAt) || byName(a, b),
  updated: (a, b) => byDate(a.updatedAt, b.updatedAt) || byName(a, b),
  name: byName,
  // Bodyweight exercises have no weight to rank, so they settle at the bottom
  // rather than pretending to be 0 kg lifts scattered through the list.
  weight: (a, b) => (b.weight ?? -1) - (a.weight ?? -1) || byName(a, b),
  volume: (a, b) =>
    tonnage(b) - tonnage(a) || repVolume(b) - repVolume(a) || byName(a, b),
};

export interface ExerciseListOptions {
  query: string;
  /** Selected muscle chips. Empty means "no muscle filter"; OR within the set. */
  muscles: string[];
  sort: SortKey;
}

export function visibleExercises(
  exercises: Exercise[],
  { query, muscles, sort }: ExerciseListOptions
): Exercise[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const wanted = new Set(muscles);
  return exercises
    .filter((ex) => matchesQuery(ex, terms))
    .filter(
      (ex) =>
        wanted.size === 0 || muscleTags(ex).some((tag) => wanted.has(tag))
    )
    .sort(COMPARATORS[sort] ?? COMPARATORS.recent);
}
