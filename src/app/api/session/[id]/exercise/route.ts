import { handleError } from "@/components/error-handle";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  sessionExerciseSchema,
  sessionExerciseUpdateSchema,
} from "@/lib/validation";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Confirm the session exists, is owned, and is still active.
async function getActiveSession(id: number, userId: string) {
  const found = await prisma.workoutSession.findUnique({ where: { id } });
  if (!found || found.userId !== userId) return { error: "notfound" as const };
  if (found.endedAt) return { error: "finished" as const };
  return { session: found };
}

// POST: log a new exercise in the session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const sessionId = Number(id);
    const guard = await getActiveSession(sessionId, session.user.id);
    if (guard.error === "notfound")
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (guard.error === "finished")
      return NextResponse.json(
        { error: "Session already finished" },
        { status: 400 }
      );

    const body = await req.json();
    const data = sessionExerciseSchema.parse(body);

    // If linked to a library exercise, make sure it's the user's.
    let exerciseId: number | null = data.exerciseId ?? null;
    let catalogId: string | null = data.catalogId ?? null;
    if (exerciseId != null) {
      const lib = await prisma.exercise.findUnique({
        where: { id: exerciseId },
      });
      if (!lib || lib.userId !== session.user.id) exerciseId = null;
      // Inherit the catalog link (and its image) from the library exercise.
      else if (catalogId == null) catalogId = lib.catalogId;
    }

    // Optionally persist an on-the-fly exercise back to the library.
    if (exerciseId == null && data.saveToLibrary) {
      const existing = await prisma.exercise.findFirst({
        where: { userId: session.user.id, name: data.name },
      });
      if (existing) {
        exerciseId = existing.id;
      } else {
        try {
          const createdLib = await prisma.exercise.create({
            data: {
              name: data.name,
              sets: data.sets ?? 0,
              reps: data.reps ?? 0,
              userId: session.user.id,
              catalogId: data.catalogId ?? null,
            },
          });
          exerciseId = createdLib.id;
        } catch {
          // name collides with another user's exercise (name is globally
          // unique) — keep it as a free-form entry instead.
          exerciseId = null;
        }
      }
    }

    const count = await prisma.sessionExercise.count({ where: { sessionId } });

    const entry = await prisma.sessionExercise.create({
      data: {
        sessionId,
        exerciseId,
        catalogId,
        name: data.name,
        sets: data.sets ?? null,
        reps: data.reps ?? null,
        weight: data.weight ?? null,
        order: count,
      },
      include: { catalog: { select: { images: true } } },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}

// PATCH: edit a logged exercise's sets/reps/weight/name
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
    const guard = await getActiveSession(sessionId, session.user.id);
    if (guard.error === "notfound")
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (guard.error === "finished")
      return NextResponse.json(
        { error: "Session already finished" },
        { status: 400 }
      );

    const body = await req.json();
    const data = sessionExerciseUpdateSchema.parse(body);

    const entry = await prisma.sessionExercise.findUnique({
      where: { id: data.entryId },
    });
    if (!entry || entry.sessionId !== sessionId)
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    const updated = await prisma.sessionExercise.update({
      where: { id: data.entryId },
      data: {
        name: data.name ?? entry.name,
        sets: data.sets === undefined ? entry.sets : data.sets,
        reps: data.reps === undefined ? entry.reps : data.reps,
        weight: data.weight === undefined ? entry.weight : data.weight,
      },
    });

    return NextResponse.json({ entry: updated }, { status: 200 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}

// DELETE: remove a logged exercise (?entryId=)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const sessionId = Number(id);
    const guard = await getActiveSession(sessionId, session.user.id);
    if (guard.error === "notfound")
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (guard.error === "finished")
      return NextResponse.json(
        { error: "Session already finished" },
        { status: 400 }
      );

    const { searchParams } = new URL(req.url);
    const entryId = Number(searchParams.get("entryId"));
    if (!entryId)
      return NextResponse.json(
        { error: "entryId is required" },
        { status: 400 }
      );

    const entry = await prisma.sessionExercise.findUnique({
      where: { id: entryId },
    });
    if (!entry || entry.sessionId !== sessionId)
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    await prisma.sessionExercise.delete({ where: { id: entryId } });
    return NextResponse.json({ message: "Entry removed" }, { status: 200 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}
