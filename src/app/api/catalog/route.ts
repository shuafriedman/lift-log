import { handleError } from "@/components/error-handle";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

// 🔎 GET: Search / browse the shared exercise catalog.
// Query params: q (name search), muscle, equipment, category, level, page, limit
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json(
      { message: "Invalid user authentication" },
      { status: 401 }
    );

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const muscle = searchParams.get("muscle")?.trim();
    const equipment = searchParams.get("equipment")?.trim();
    const category = searchParams.get("category")?.trim();
    const level = searchParams.get("level")?.trim();

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(60, Math.max(1, Number(searchParams.get("limit")) || 24));

    const where: Prisma.ExerciseCatalogWhereInput = {};
    if (q) where.name = { contains: q, mode: "insensitive" };
    if (equipment) where.equipment = equipment;
    if (category) where.category = category;
    if (level) where.level = level;
    if (muscle) where.primaryMuscles = { has: muscle };

    const [items, total] = await Promise.all([
      prisma.exerciseCatalog.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.exerciseCatalog.count({ where }),
    ]);

    return NextResponse.json(
      {
        items,
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}
