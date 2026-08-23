import { handleError } from "@/components/error-handle";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sessionCreateSchema } from "@/lib/validation";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// GET: list the user's sessions, or the current active one with ?active=1
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active");

    if (activeOnly) {
      const active = await prisma.workoutSession.findFirst({
        where: { userId: session.user.id, endedAt: null },
        orderBy: { startedAt: "desc" },
        include: { entries: { orderBy: { order: "asc" } } },
      });
      return NextResponse.json({ session: active }, { status: 200 });
    }

    const sessions = await prisma.workoutSession.findMany({
      where: { userId: session.user.id },
      orderBy: { startedAt: "desc" },
      include: { entries: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}

// POST: start a new on-the-fly session
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { name } = sessionCreateSchema.parse(body ?? {});

    const created = await prisma.workoutSession.create({
      data: {
        userId: session.user.id,
        name: name && name.length > 0 ? name : null,
      },
      include: { entries: true },
    });

    return NextResponse.json({ session: created }, { status: 201 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}
