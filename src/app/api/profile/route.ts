//src/app/api/profile/route.ts
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { apiProfileSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

async function getSession(req: NextRequest) {
  return await auth.api.getSession({ headers: req.headers });
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { height: true, weight: true },
  });

  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const data = apiProfileSchema.parse(await req.json());

    await prisma.user.update({
      where: { id: session.user.id },
      data,
    });

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid profile data." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Failed to update profile." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  await prisma.$transaction([
    prisma.streak.deleteMany({ where: { userId } }),
    prisma.workoutExercise.deleteMany({
      where: {
        OR: [
          { Workout: { userId } },
          { Exercise: { userId } },
        ],
      },
    }),
    prisma.exercise.deleteMany({ where: { userId } }),
    prisma.workout.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ message: "Account deleted successfully" });
}
