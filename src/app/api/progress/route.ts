import { handleError } from "@/components/error-handle";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";


// Helper to get session
async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Invalid User");
  return session;
}

// GET the user's hand-logged body metrics.
// What was lifted lives on WorkoutSession/SessionExercise — see
// /api/progress/summary for the rolled-up training view.
export async function GET() {
  try {
    const session = await getSession();

    const progressData = await prisma.progress.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      include: { workout: true },
    });

    const result = progressData.map((p) => ({
      id: p.id,
      date: p.date.toISOString(),
      workout: p.workout?.name ?? null,
      weight: p.weight ?? null,
      caloriesBurned: p.caloriesBurned ?? null,
    }));

    return NextResponse.json({ success: true, progress: result });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// POST a body-metric entry.
// This no longer touches the streak: the streak counts days you trained, and
// stepping on a scale isn't training. Finishing a session is what bumps it.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    const { workoutId, weight, caloriesBurned, date } = await req.json();

    if (weight == null && caloriesBurned == null) {
      return NextResponse.json(
        { message: "Log a body weight or calories burned" },
        { status: 400 }
      );
    }

    // Create the entry. The workout is optional — weighing yourself
    // isn't tied to a workout, and requiring one blocked the common case.
    const progress = await prisma.progress.create({
      data: {
        userId: session.user.id,
        workoutId: workoutId ?? null,
        date: date ? new Date(date) : new Date(),
        weight: weight ?? null,
        caloriesBurned: caloriesBurned ?? null,
      },
      include: { workout: true },
    });

    return NextResponse.json({
      id: progress.id,
      workout: progress.workout?.name ?? null,
      weight: progress.weight ?? null,
      caloriesBurned: progress.caloriesBurned ?? null,
      date: progress.date.toISOString(),
    });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE progress entry
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Progress ID is required" },
        { status: 400 }
      );
    }

    await prisma.progress.deleteMany({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ message: "Progress entry deleted" });
  } catch (error: unknown) {
    handleError(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
