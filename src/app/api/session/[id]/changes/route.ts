import { handleError } from "@/components/error-handle";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// GET: the exercises whose logged values in this session drifted from the
// user's saved default — the list the finish screen offers to sync globally.
//
// Session entries pre-fill from the library default, so an untouched entry
// matches and is skipped; only ones the user actually changed mid-session
// surface here. When the same exercise is logged more than once, the last
// entry (highest order) is treated as where they ended up.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const sessionId = Number(id);

    const owned = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: { entries: { orderBy: { order: "asc" } } },
    });
    if (!owned || owned.userId !== session.user.id)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Last entry wins per linked exercise.
    const latestByExercise = new Map<number, (typeof owned.entries)[number]>();
    for (const entry of owned.entries) {
      if (entry.exerciseId == null) continue;
      latestByExercise.set(entry.exerciseId, entry);
    }

    const exerciseIds = [...latestByExercise.keys()];
    const library = exerciseIds.length
      ? await prisma.exercise.findMany({
          where: { id: { in: exerciseIds }, userId: session.user.id },
        })
      : [];

    const changes = [];
    for (const lib of library) {
      const entry = latestByExercise.get(lib.id);
      if (!entry) continue;
      const logged = {
        sets: entry.sets,
        reps: entry.reps,
        weight: entry.weight,
      };
      const current = { sets: lib.sets, reps: lib.reps, weight: lib.weight };
      const changed =
        logged.sets !== current.sets ||
        logged.reps !== current.reps ||
        logged.weight !== current.weight;
      if (changed)
        changes.push({ exerciseId: lib.id, name: lib.name, logged, current });
    }

    return NextResponse.json({ changes }, { status: 200 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}
