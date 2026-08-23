import { handleError } from "@/components/error-handle";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { exerciseSchema } from "@/lib/validation";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// 🧠 GET: Fetch all exercises + stats (total lifts, average reps)
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json(
      { message: "Invalid user authentication" },
      { status: 401 }
    );

  try {
    const exercises = await prisma.exercise.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        catalog: {
          select: {
            id: true,
            images: true,
            category: true,
            equipment: true,
            primaryMuscles: true,
            level: true,
          },
        },
      },
    });

    if (!exercises || exercises.length === 0) {
      return NextResponse.json(
        {
          message: "No exercises found",
          exercises: [],
          totalLifts: 0,
          totalWeekLifts: 0,
          averageReps: 0,
        },
        { status: 200 }
      );
    }

    // Total lifts = sum of (sets * reps)
    const totalLifts = exercises.reduce(
      (total, exercise) => total + exercise.sets * exercise.reps,
      0
    );

    // For now, we'll simulate total week lifts as total lifts in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekExercises = exercises.filter(
      (ex) => ex.createdAt >= sevenDaysAgo
    );

    const totalWeekLifts = weekExercises.reduce(
      (total, exercise) => total + exercise.sets * exercise.reps,
      0
    );

    // Average reps across all exercises
    const averageReps =
      exercises.reduce((sum, exercise) => sum + exercise.reps, 0) /
      exercises.length;

    return NextResponse.json(
      { exercises, totalLifts, totalWeekLifts, averageReps },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}

// 🏋️ POST: Create a new exercise
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ message: "Invalid User" }, { status: 401 });

  try {
    const body = await req.json();
    const validateData = exerciseSchema.parse(body);

    const { name } = validateData;

    const existingExercise = await prisma.exercise.findFirst({
      where: {
        userId: session.user.id,
        name,
      },
    });

    if (existingExercise) {
      return NextResponse.json(
        { message: "Exercise with this name already exists." },
        { status: 400 }
      );
    }

    const created = await prisma.exercise.create({
      data: {
        name: validateData.name,
        sets: validateData.sets,
        reps: validateData.reps,
        userId: session.user.id,
        catalogId: validateData.catalogId ?? null,
      },
    });

    // The id comes back so the caller can attach a photo right after creating.
    return NextResponse.json({
      message: "Exercise created successfully",
      exercise: created,
    });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}

// 🗑️ DELETE: Remove an exercise by ID
export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json(
      { message: "User does not exist" },
      { status: 401 }
    );

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Exercise ID is required" },
        { status: 400 }
      );
    }

    const exercise = await prisma.exercise.findUnique({
      where: { id: Number(id) },
    });

    if (!exercise || exercise.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Exercise not found or not authorized" },
        { status: 400 }
      );
    }

    // Clean up relations before deleting exercise
    await prisma.workoutExercise.deleteMany({
      where: { exerciseId: Number(id) },
    });

    await prisma.exercise.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Exercise deleted successfully" });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}
