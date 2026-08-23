// Client-side image helpers for exercise photos.
//
// Photos are squared and downscaled in the browser before upload so the
// payload stays small (~100-200KB) regardless of how big the phone's camera is.

export const PHOTO_MAX_SIZE = 1080;
export const PHOTO_MIME = "image/jpeg";
export const PHOTO_QUALITY = 0.85;

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

// Center-crop a decoded image/video frame to a square and encode it as JPEG.
export async function toSquareJpeg(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  max: number = PHOTO_MAX_SIZE
): Promise<ProcessedPhoto> {
  const side = Math.min(sourceWidth, sourceHeight);
  const sx = (sourceWidth - side) / 2;
  const sy = (sourceHeight - side) / 2;
  const size = Math.round(Math.min(side, max));

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the photo on this device.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, PHOTO_MIME, PHOTO_QUALITY)
  );
  if (!blob) throw new Error("Could not save the photo. Try again.");
  return { blob, width: size, height: size };
}

// Decode a picked/captured file, honouring EXIF orientation where supported,
// then square + shrink it.
export async function fileToSquareJpeg(
  file: Blob,
  max: number = PHOTO_MAX_SIZE
): Promise<ProcessedPhoto> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      try {
        return await toSquareJpeg(bitmap, bitmap.width, bitmap.height, max);
      } finally {
        bitmap.close();
      }
    } catch {
      // Older Safari rejects the imageOrientation option — fall through to <img>,
      // which applies EXIF orientation on its own in modern browsers.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await toSquareJpeg(img, img.naturalWidth, img.naturalHeight, max);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Upload a processed photo to an exercise. Returns the new photo version stamp.
export async function uploadExercisePhoto(
  exerciseId: number,
  photo: ProcessedPhoto
): Promise<string> {
  const res = await fetch(`/api/exercise/${exerciseId}/photo`, {
    method: "PUT",
    headers: {
      "Content-Type": photo.blob.type || PHOTO_MIME,
      "x-image-width": String(photo.width),
      "x-image-height": String(photo.height),
    },
    body: photo.blob,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? "Failed to upload photo");
  }
  const data = await res.json();
  return data.photoUpdatedAt as string;
}

// Versioned URL so a replaced photo busts the immutable cache.
export function exercisePhotoUrl(
  exerciseId: number,
  photoUpdatedAt: string | null | undefined
): string | null {
  if (!photoUpdatedAt) return null;
  return `/api/exercise/${exerciseId}/photo?v=${encodeURIComponent(
    photoUpdatedAt
  )}`;
}
