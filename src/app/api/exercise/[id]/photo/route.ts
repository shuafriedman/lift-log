import { handleError } from "@/components/error-handle";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Photos are compressed client-side before upload; this is a sanity ceiling.
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Load an exercise and confirm it belongs to the current user.
async function getOwnedExercise(id: number, userId: string) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const found = await prisma.exercise.findUnique({ where: { id } });
  if (!found || found.userId !== userId) return null;
  return found;
}

// 📷 GET: serve the user's photo bytes. The <img> src carries ?v=<photoUpdatedAt>,
// so the response can be cached hard — a new photo means a new URL.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const owned = await getOwnedExercise(Number(id), session.user.id);
    if (!owned)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const photo = await prisma.exercisePhoto.findUnique({
      where: { exerciseId: owned.id },
    });
    if (!photo)
      return NextResponse.json({ message: "No photo" }, { status: 404 });

    return new NextResponse(new Uint8Array(photo.data), {
      status: 200,
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Length": String(photo.data.length),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}

// 📤 PUT: upload (or replace) the photo. Body is the raw image blob.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const owned = await getOwnedExercise(Number(id), session.user.id);
    if (!owned)
      return NextResponse.json(
        { message: "Exercise not found or not authorized" },
        { status: 404 }
      );

    const mimeType = (req.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!ALLOWED_TYPES.includes(mimeType))
      return NextResponse.json(
        { message: "Photo must be a JPEG, PNG, or WebP image" },
        { status: 415 }
      );

    const data = new Uint8Array(await req.arrayBuffer());
    if (data.length === 0)
      return NextResponse.json({ message: "Empty photo" }, { status: 400 });
    if (data.length > MAX_BYTES)
      return NextResponse.json(
        { message: "Photo is too large (max 5MB)" },
        { status: 413 }
      );

    const width = Number(req.headers.get("x-image-width")) || 0;
    const height = Number(req.headers.get("x-image-height")) || 0;

    const photoUpdatedAt = new Date();
    await prisma.$transaction([
      prisma.exercisePhoto.upsert({
        where: { exerciseId: owned.id },
        create: { exerciseId: owned.id, data, mimeType, width, height },
        update: { data, mimeType, width, height },
      }),
      prisma.exercise.update({
        where: { id: owned.id },
        data: { photoUpdatedAt },
      }),
    ]);

    return NextResponse.json(
      { message: "Photo saved", photoUpdatedAt },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}

// 🗑️ DELETE: drop the photo and fall back to the catalog image (if any).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const owned = await getOwnedExercise(Number(id), session.user.id);
    if (!owned)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.exercisePhoto.deleteMany({ where: { exerciseId: owned.id } }),
      prisma.exercise.update({
        where: { id: owned.id },
        data: { photoUpdatedAt: null },
      }),
    ]);

    return NextResponse.json({ message: "Photo removed" }, { status: 200 });
  } catch (error: unknown) {
    const err = handleError(error);
    return NextResponse.json(err, { status: 500 });
  }
}
