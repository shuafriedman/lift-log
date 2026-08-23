import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { workoutSchema } from "@/lib/validation";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const workouts = await prisma.workout.findMany({
      where: { userId: session.user.id },
      include: {
        workoutExercises: {
          include: {
            // Use include, not select, for nested relation
            Exercise: true,
          },
        },
      },
    });

    return NextResponse.json(workouts, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 401 });
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error("unexpected error", error);
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    console.log("incoming body", body);

    const validateData = workoutSchema.parse(body);
    const { name, exercises } = validateData;
    await prisma.workout.create({
      data: {
        userId: session.user.id,
        name,
        workoutExercises: {
          create: exercises.map((exerciseId) => ({
            exerciseId,
          })),
        },
      },
      include: {
        workoutExercises: true,
      },
    });

    return NextResponse.json(
      { message: "Workout created successfully" },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    } else if (error instanceof Error) {
      console.error(error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      console.error("unexpected error", error);
    }
  }
}

// DELETE ?id= — remove the workout (and unlink it from progress).
// DELETE ?id=&exerciseId= — pull one exercise out of the workout.
export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    const exerciseIdParam = searchParams.get("exerciseId");

    if (!id) {
      return NextResponse.json(
        { error: "Workout ID is required" },
        { status: 400 }
      );
    }

    const workout = await prisma.workout.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!workout) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (exerciseIdParam) {
      const exerciseId = Number(exerciseIdParam);
      await prisma.workoutExercise.deleteMany({
        where: { workoutId: id, exerciseId },
      });
      return NextResponse.json({ message: "Exercise removed" }, { status: 200 });
    }

    await prisma.$transaction([
      prisma.progress.updateMany({
        where: { workoutId: id, userId: session.user.id },
        data: { workoutId: null },
      }),
      prisma.workoutExercise.deleteMany({ where: { workoutId: id } }),
      prisma.workout.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Workout deleted" }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
