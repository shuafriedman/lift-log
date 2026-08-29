import { handleError } from "@/components/error-handle";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { bumpStreak } from "@/lib/streak";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Load a session and confirm it belongs to the current user.
async function getOwnedSession(id: number, userId: string) {
  const found = await prisma.workoutSession.findUnique({
    where: { id },
    include: {
      entries: {
        orderBy: { order: "asc" },
        include: { catalog: { select: { images: true } } },
      },
    },
  });
  if (!found || found.userId !== userId) return null;
  return found;
}

// GET: a single session with its logged exercises
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const owned = await getOwnedSession(Number(id), session.user.id);
    if (!owned)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ session: owned }, { status: 200 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}

// PATCH: finish a session (action: "finish") or rename it
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const sessionId = Number(id);
    const owned = await getOwnedSession(sessionId, session.user.id);
    if (!owned)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    // Rename
    if (typeof body.name === "string") {
      await prisma.workoutSession.update({
        where: { id: sessionId },
        data: { name: body.name.trim() || null },
      });
    }

    // Finish: stamp endedAt and bump the streak.
    if (body.action === "finish") {
      if (owned.endedAt) {
        return NextResponse.json(
          { error: "Session already finished" },
          { status: 400 }
        );
      }

      // Exercises the user chose to promote to their global default on the
      // finish screen. Values come from this session's own entries (last one
      // wins) rather than client-sent numbers, so the default always mirrors
      // what was actually logged.
      const updateDefaults: number[] = Array.isArray(body.updateDefaults)
        ? body.updateDefaults
            .map((n: unknown) => Number(n))
            .filter((n: number) => Number.isInteger(n) && n > 0)
        : [];

      if (updateDefaults.length > 0) {
        const latestByExercise = new Map<
          number,
          (typeof owned.entries)[number]
        >();
        for (const entry of owned.entries) {
          if (entry.exerciseId == null) continue;
          latestByExercise.set(entry.exerciseId, entry);
        }
        for (const exerciseId of updateDefaults) {
          const entry = latestByExercise.get(exerciseId);
          if (!entry) continue;
          await prisma.exercise.updateMany({
            // Scope to the owner so a spoofed id can't touch another user's row.
            where: { id: exerciseId, userId: session.user.id },
            data: {
              ...(entry.sets != null ? { sets: entry.sets } : {}),
              ...(entry.reps != null ? { reps: entry.reps } : {}),
              weight: entry.weight,
            },
          });
        }
      }

      await prisma.workoutSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });

      // The session and its entries ARE the record of what was lifted — they
      // carry the exercise, sets, reps and weight. Finishing used to also write
      // one bare Progress row per exercise, which turned a single five-exercise
      // session into five identical entries on the Progress tab with none of
      // the detail. Progress is now only the user's hand-logged body metrics.
      if (owned.entries.length > 0) {
        await bumpStreak(session.user.id);
      }
    }

    const updated = await getOwnedSession(sessionId, session.user.id);
    return NextResponse.json({ session: updated }, { status: 200 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}

// DELETE: remove a session (entries cascade)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const sessionId = Number(id);
    const owned = await getOwnedSession(sessionId, session.user.id);
    if (!owned)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.workoutSession.delete({ where: { id: sessionId } });
    return NextResponse.json({ message: "Session deleted" }, { status: 200 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}
