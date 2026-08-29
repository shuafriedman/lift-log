import { handleError } from "@/components/error-handle";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  entryReps,
  entryVolume,
  estimatedOneRepMax,
  exerciseKey,
  round1,
  type ExercisePoint,
  type ExerciseSeries,
  type ProgressSummary,
  type SessionSummary,
} from "@/lib/analytics";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Everything the Progress tab charts, in one round trip.
 *
 * Sessions are the source of truth for what was lifted; the Progress table is
 * only the user's hand-logged body metrics. Rolling both up here keeps the
 * client from having to fetch every session and re-derive the maths.
 */
export async function GET() {
  const authed = await auth.api.getSession({ headers: await headers() });
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = authed.user.id;

    const [workoutSessions, bodyRows, streak] = await Promise.all([
      prisma.workoutSession.findMany({
        where: { userId },
        orderBy: { startedAt: "asc" },
        include: { entries: { orderBy: { order: "asc" } } },
      }),
      prisma.progress.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        include: { workout: { select: { name: true } } },
      }),
      prisma.streak.findUnique({ where: { userId } }),
    ]);

    const sessions: SessionSummary[] = workoutSessions.map((s) => {
      const weights = s.entries
        .map((e) => e.weight)
        .filter((w): w is number => w != null);

      return {
        id: s.id,
        name: s.name,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
        durationMin: s.endedAt
          ? Math.max(
              0,
              Math.round(
                (s.endedAt.getTime() - s.startedAt.getTime()) / 60000
              )
            )
          : null,
        exerciseCount: s.entries.length,
        setCount: s.entries.reduce((sum, e) => sum + (e.sets ?? 0), 0),
        totalReps: s.entries.reduce((sum, e) => sum + entryReps(e), 0),
        volume: round1(
          s.entries.reduce((sum, e) => sum + entryVolume(e), 0)
        ),
        topWeight: weights.length > 0 ? Math.max(...weights) : null,
        entries: s.entries.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
        })),
      };
    });

    /* Per-exercise history. One point per session an exercise appeared in; a
       lift logged twice in the same session collapses into its heaviest set so
       the trend line stays one-point-per-day. */
    const byExercise = new Map<string, ExerciseSeries>();

    for (const s of workoutSessions) {
      for (const e of s.entries) {
        const key = exerciseKey(e.name);
        if (!key) continue;

        const point: ExercisePoint = {
          sessionId: s.id,
          date: s.startedAt.toISOString(),
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          volume: entryVolume(e),
          oneRepMax: estimatedOneRepMax(e.weight, e.reps),
        };

        const series = byExercise.get(key);
        if (!series) {
          byExercise.set(key, {
            key,
            name: e.name,
            points: [point],
            timesPerformed: 1,
            bestWeight: e.weight,
            bestOneRepMax: point.oneRepMax,
            bestVolume: point.volume,
            lastPerformed: point.date,
            weightDelta: null,
          });
          continue;
        }

        // Newest name wins, so renaming a lift doesn't strand its history.
        series.name = e.name;
        series.lastPerformed = point.date;
        series.bestWeight = maxOrNull(series.bestWeight, e.weight);
        series.bestOneRepMax = maxOrNull(series.bestOneRepMax, point.oneRepMax);
        series.bestVolume = Math.max(series.bestVolume, point.volume);

        const existing = series.points.find((p) => p.sessionId === s.id);
        if (!existing) {
          series.points.push(point);
          series.timesPerformed += 1;
        } else if ((point.weight ?? 0) > (existing.weight ?? 0)) {
          Object.assign(existing, point);
        } else {
          existing.volume = round1(existing.volume + point.volume);
        }
      }
    }

    const exercises = [...byExercise.values()]
      .map((series) => {
        const first = series.points[0];
        const last = series.points[series.points.length - 1];
        return {
          ...series,
          weightDelta:
            series.points.length > 1 &&
            first.weight != null &&
            last.weight != null
              ? round1(last.weight - first.weight)
              : null,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastPerformed).getTime() -
          new Date(a.lastPerformed).getTime()
      );

    const summary: ProgressSummary = {
      streak: streak?.count ?? 0,
      sessions,
      exercises,
      bodyWeight: bodyRows.map((p) => ({
        id: p.id,
        date: p.date.toISOString(),
        weight: p.weight,
        caloriesBurned: p.caloriesBurned,
        workout: p.workout?.name ?? null,
      })),
    };

    return NextResponse.json({ success: true, ...summary }, { status: 200 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}

function maxOrNull(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}
