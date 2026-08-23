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

    // Finish: stamp endedAt, log progress per exercise, bump streak.
    if (body.action === "finish") {
      if (owned.endedAt) {
        return NextResponse.json(
          { error: "Session already finished" },
          { status: 400 }
        );
      }

      await prisma.workoutSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });

      // One Progress entry per logged exercise (individual progress).
      const withWeight = owned.entries.filter((e) => e.weight != null);
      if (owned.entries.length > 0) {
        await prisma.progress.createMany({
          data: (withWeight.length > 0 ? withWeight : owned.entries).map(
            (e) => ({
              userId: session.user.id,
              weight: e.weight ?? null,
            })
          ),
        });
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
