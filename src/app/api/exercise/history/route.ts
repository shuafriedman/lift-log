import { handleError } from "@/components/error-handle";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { exerciseKey } from "@/lib/analytics";
import {
  suggestNextLoad,
  type ExerciseHistory,
  type LastPerformance,
} from "@/lib/load-progression";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET: the last time each exercise was actually logged, plus the load to aim
 * for next — what the pickers show when you choose an exercise you've done
 * before.
 *
 * Sessions are the source of truth for what was lifted (the library only holds
 * the prescription), so this reads session entries rather than Exercise rows.
 * Entries are grouped by normalised name, the identity the library, the shared
 * catalog and free-hand entries all have in common.
 */
export async function GET() {
  const authed = await auth.api.getSession({ headers: await headers() });
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const entries = await prisma.sessionExercise.findMany({
      where: { session: { userId: authed.user.id } },
      // Newest session first, and within a session the entry logged last —
      // that's where the user ended up on this lift.
      orderBy: [{ session: { startedAt: "desc" } }, { order: "desc" }],
      select: {
        sessionId: true,
        exerciseId: true,
        name: true,
        sets: true,
        reps: true,
        weight: true,
        session: { select: { startedAt: true } },
      },
    });

    const history = new Map<string, ExerciseHistory>();
    for (const entry of entries) {
      const key = exerciseKey(entry.name);
      // The list is newest-first, so the first hit per exercise is the one.
      if (history.has(key)) continue;

      const last: LastPerformance = {
        sessionId: entry.sessionId,
        performedAt: entry.session.startedAt.toISOString(),
        sets: entry.sets,
        reps: entry.reps,
        weight: entry.weight,
      };
      history.set(key, {
        key,
        name: entry.name,
        exerciseId: entry.exerciseId,
        last,
        suggestion: suggestNextLoad(last),
      });
    }

    return NextResponse.json(
      { history: [...history.values()] },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}
