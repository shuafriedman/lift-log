"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Camera, Check, Images, RotateCcw, SwitchCamera, X } from "lucide-react";
import {
  fileToSquareJpeg,
  toSquareJpeg,
  type ProcessedPhoto,
} from "@/lib/image";

type Facing = "environment" | "user";
type Status = "starting" | "ready" | "error" | "unavailable";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  /** Called with the squared, compressed JPEG once the user confirms the shot. */
  onCapture: (photo: ProcessedPhoto) => void | Promise<void>;
  title?: string;
  /** Shown on the confirm button, e.g. "Use photo" / "Save photo". */
  confirmLabel?: string;
  /** Keeps the sheet open with a spinner while the parent uploads. */
  saving?: boolean;
}

function describeCameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access is blocked. Allow it in your browser settings, or pick a photo from your library below.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device.";
    case "NotReadableError":
      return "The camera is already in use by another app. Close it and try again.";
    default:
      return "Could not start the camera. You can still pick a photo from your library below.";
  }
}

export default function CameraCapture({
  open,
  onClose,
  onCapture,
  title = "Take a photo",
  confirmLabel = "Use photo",
  saving = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [facing, setFacing] = useState<Facing>("environment");
  const [status, setStatus] = useState<Status>("starting");
  const [error, setError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [shot, setShot] = useState<ProcessedPhoto | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Live camera stream. Restarts when the sheet opens or the user flips cameras.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let stream: MediaStream | null = null;

    const start = async () => {
      setError(null);
      setStatus("starting");

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        // No secure context / no support — the file inputs still reach the camera.
        setStatus("unavailable");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setStatus("ready");

        // Only show the flip button when there's actually something to flip to.
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled)
          setHasMultipleCameras(
            devices.filter((d) => d.kind === "videoinput").length > 1
          );
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(describeCameraError(err));
      }
    };

    start();

    // Read the node now: by cleanup time the ref may already point elsewhere.
    const video = videoRef.current;

    // Always hand the camera back — a live track keeps the phone's LED on.
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [open, facing]);

  // iOS pauses the preview when the tab goes to the background.
  useEffect(() => {
    if (!open) return;
    const resume = () => {
      if (document.visibilityState === "visible")
        videoRef.current?.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, [open]);

  // Reset everything when the sheet closes.
  useEffect(() => {
    if (open) return;
    setShot(null);
    setStatus("starting");
    setError(null);
    setProcessing(false);
  }, [open]);

  // Preview URL for the captured frame.
  useEffect(() => {
    if (!shot) {
      setShotUrl(null);
      return;
    }
    const url = URL.createObjectURL(shot.blob);
    setShotUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [shot]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    try {
      setProcessing(true);
      const photo = await toSquareJpeg(
        video,
        video.videoWidth,
        video.videoHeight
      );
      setShot(photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not take the photo.");
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      setProcessing(true);
      setError(null);
      setShot(await fileToSquareJpeg(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image.");
    } finally {
      setProcessing(false);
    }
  };

  const busy = processing || saving;
  const showLiveView = status === "starting" || status === "ready";

  return (
    // Radix owns the layer: the sheet is often opened from inside another dialog,
    // whose transform would otherwise trap a plain `position: fixed` overlay.
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !saving) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] h-[100dvh] bg-black" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[121] flex h-[100dvh] flex-col bg-black text-white outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            {title}
          </DialogPrimitive.Title>

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20 disabled:opacity-50"
              aria-label="Close camera"
            >
              <X className="h-6 w-6" />
            </button>
            <p className="mx-2 min-w-0 flex-1 truncate text-center text-base font-semibold">
              {shot ? "Looks good?" : title}
            </p>
            {hasMultipleCameras && !shot ? (
              <button
                type="button"
                onClick={() =>
                  setFacing((f) => (f === "environment" ? "user" : "environment"))
                }
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
                aria-label="Switch camera"
              >
                <SwitchCamera className="h-6 w-6" />
              </button>
            ) : (
              <span className="h-11 w-11 flex-shrink-0" />
            )}
          </div>

          {/* Viewfinder / review */}
          <div className="relative flex-1 overflow-hidden">
            {shot && shotUrl ? (
              <div className="flex h-full w-full items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shotUrl}
                  alt="Captured exercise photo"
                  className="max-h-full w-full max-w-md rounded-2xl object-contain"
                />
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`h-full w-full object-cover ${
                    facing === "user" ? "-scale-x-100" : ""
                  } ${showLiveView ? "" : "invisible"}`}
                />

                {status === "ready" && (
                  // Framing guide — shows exactly what the square crop will keep.
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="aspect-square w-[86%] max-w-md rounded-3xl border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  </div>
                )}

                {status === "starting" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </div>
                )}

                {(status === "error" || status === "unavailable") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                    <div className="rounded-full bg-white/10 p-4">
                      <Camera className="h-8 w-8" />
                    </div>
                    <p className="text-sm text-neutral-300">
                      {error ??
                        "Live camera isn't available here. Use your device camera or pick a photo below."}
                    </p>
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black active:bg-neutral-200"
                    >
                      Open device camera
                    </button>
                  </div>
                )}
              </>
            )}

            {error && status === "ready" && (
              <p className="absolute inset-x-4 bottom-4 rounded-xl bg-red-950/90 px-4 py-3 text-center text-sm text-red-200">
                {error}
              </p>
            )}
          </div>

          {/* Controls */}
          <div
            className="px-6 pt-4"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)",
            }}
          >
            {shot ? (
              <div className="mx-auto flex max-w-md gap-3">
                <button
                  type="button"
                  onClick={() => setShot(null)}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-white/20 py-4 text-base font-semibold active:bg-white/10 disabled:opacity-50"
                >
                  <RotateCcw className="h-5 w-5" />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={() => onCapture(shot)}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-500 py-4 text-base font-bold text-black active:bg-teal-400 disabled:opacity-60"
                >
                  {saving ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  {saving ? "Saving…" : confirmLabel}
                </button>
              </div>
            ) : (
              <div className="mx-auto flex max-w-md items-center justify-between">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={busy}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 active:bg-white/20 disabled:opacity-50"
                  aria-label="Choose from photos"
                >
                  <Images className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={capture}
                  disabled={status !== "ready" || busy}
                  className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/80 transition-transform active:scale-95 disabled:opacity-40"
                  aria-label="Take photo"
                >
                  <span className="h-16 w-16 rounded-full bg-white" />
                </button>

                <span className="h-14 w-14" />
              </div>
            )}
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
