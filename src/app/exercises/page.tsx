"use client";

import { useState, useEffect } from "react";
import ExerciseDialog from "./exercise-dialog";
import { handleError } from "@/components/error-handle";
import { MdFitnessCenter, MdDelete } from "react-icons/md";
import { BiDumbbell } from "react-icons/bi";
import { AiOutlineCheckCircle } from "react-icons/ai";
import { Camera, ImageOff } from "lucide-react";
import CameraCapture from "@/components/camera-capture";
import {
  exercisePhotoUrl,
  uploadExercisePhoto,
  type ProcessedPhoto,
} from "@/lib/image";
import LogoLoading from "../logo-loading/page";
import ConfirmSheet from "@/components/confirm-sheet";
import LiftLogMark from "@/components/lift-log-mark";

export interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  category: string;
  createdAt: string;
  updatedAt: string;
  /** Set when the user has taken their own photo for this exercise. */
  photoUpdatedAt?: string | null;
  catalog?: {
    id: string;
    images: string[];
    category: string | null;
    equipment: string | null;
    primaryMuscles: string[];
    level: string | null;
  } | null;
}

export default function Exercise() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // Pending destructive actions, confirmed through an in-app sheet rather than
  // window.confirm (an unstyled OS alert pinned out of thumb reach on Android).
  const [pendingDelete, setPendingDelete] = useState<Exercise | null>(null);
  const [pendingPhotoRemoval, setPendingPhotoRemoval] = useState<Exercise | null>(
    null
  );
  // Which exercise the camera sheet is currently shooting for.
  const [photoTarget, setPhotoTarget] = useState<Exercise | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/exercise");

      if (!res.ok) throw new Error(`Failed to fetch exercises (${res.status})`);

      const data = await res.json();
      if (Array.isArray(data)) {
        setExercises(data);
      } else if (Array.isArray(data.exercises)) {
        setExercises(data.exercises);
      } else {
        setExercises([]);
      }
    } catch (error: unknown) {
      const err = handleError(error);
      setError(typeof err === "string" ? err : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleteId(id);
      const res = await fetch(`/api/exercise?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete exercise");

      setExercises(exercises.filter((ex) => ex.id !== id));
    } catch (error) {
      const err = handleError(error);
      setError(typeof err === "string" ? err : "An error occurred.");
    } finally {
      setDeleteId(null);
      setPendingDelete(null);
    }
  };

  // Save a freshly taken photo, then swap it into the card without a refetch.
  const handlePhotoCapture = async (photo: ProcessedPhoto) => {
    if (!photoTarget) return;
    const target = photoTarget;
    try {
      setSavingPhoto(true);
      setError("");
      const photoUpdatedAt = await uploadExercisePhoto(target.id, photo);
      setExercises((prev) =>
        prev.map((ex) => (ex.id === target.id ? { ...ex, photoUpdatedAt } : ex))
      );
      setPhotoTarget(null);
    } catch (error) {
      const err = handleError(error);
      setError(typeof err === "string" ? err : "Could not save the photo.");
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleRemovePhoto = async (id: number) => {
    try {
      const res = await fetch(`/api/exercise/${id}/photo`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove photo");
      setExercises((prev) =>
        prev.map((ex) => (ex.id === id ? { ...ex, photoUpdatedAt: null } : ex))
      );
    } catch (error) {
      const err = handleError(error);
      setError(typeof err === "string" ? err : "Could not remove the photo.");
    } finally {
      setPendingPhotoRemoval(null);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  if (loading) {
    return <LogoLoading />
  }

  return (
    <div className="px-4 py-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header. The 70px logo and 3xl title ate a third of a phone screen
            before you saw a single exercise — both scale down on mobile. */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <LiftLogMark className="h-10 w-10 shrink-0 md:h-14 md:w-14" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold md:text-3xl">
                My Exercises
              </h1>
              <p className="text-sm text-neutral-400">
                {exercises.length}{" "}
                {exercises.length === 1 ? "exercise" : "exercises"} tracked
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <ExerciseDialog onsuccess={fetchExercises} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border-2 border-red-800 p-4 dark:bg-neutral-950">
            <MdFitnessCenter className="shrink-0 text-xl text-red-500" />
            <p className="font-medium text-red-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {exercises.length === 0 && !loading && !error && (
          <div className="rounded-2xl border border-neutral-800 px-6 py-10 text-center">
            <BiDumbbell className="mx-auto mb-4 text-5xl" />
            <h3 className="mb-2 text-xl font-bold">No Exercises Yet</h3>
            <p className="mx-auto mb-5 max-w-md text-sm text-neutral-400">
              Start tracking your fitness journey by adding your first exercise
              using the button above!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <AiOutlineCheckCircle className="text-lg" />
              <span className="font-medium">
                Tap &quot;Add Exercise&quot; to begin
              </span>
            </div>
          </div>
        )}

        {/* Exercise list — one card per row on a phone. Two cramped columns
            made the photo, the badges and the numbers all illegible. */}
        {exercises.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex, index) => {
              // The user's own photo always wins over the stock catalog image.
              const ownPhoto = exercisePhotoUrl(ex.id, ex.photoUpdatedAt);
              const image = ownPhoto ?? ex.catalog?.images?.[0] ?? null;
              return (
                <div
                  key={ex.id}
                  className="relative overflow-hidden rounded-2xl border border-teal-950 shadow-lg backdrop-blur-xl"
                  style={{
                    animation: `fadeIn 0.4s ease-out ${Math.min(index, 6) * 0.06}s both`,
                  }}
                >
                  {/* Card header — your photo, or the catalog image as a backdrop */}
                  <div
                    className={`relative overflow-hidden ${
                      ownPhoto ? "aspect-[16/9] p-3 sm:aspect-[4/3]" : "p-4"
                    }`}
                  >
                    {image && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image}
                          alt=""
                          className={`absolute inset-0 h-full w-full object-cover ${
                            ownPhoto ? "opacity-100" : "opacity-40"
                          }`}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
                      </>
                    )}
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="rounded-xl bg-black/30 p-2.5 backdrop-blur-sm">
                        <BiDumbbell className="text-2xl" />
                      </div>
                      {/* 44px controls: these are tapped with a thumb, often
                          mid-set with one hand. */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPhotoTarget(ex)}
                          className="tap-scale touch-target flex items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm active:bg-teal-600"
                          aria-label={ownPhoto ? "Retake photo" : "Take a photo"}
                        >
                          <Camera className="h-5 w-5" />
                        </button>
                        {ownPhoto && (
                          <button
                            onClick={() => setPendingPhotoRemoval(ex)}
                            className="tap-scale touch-target flex items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm active:bg-neutral-700"
                            aria-label="Remove your photo"
                          >
                            <ImageOff className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => setPendingDelete(ex)}
                          disabled={deleteId === ex.id}
                          className="tap-scale touch-target flex items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm active:bg-red-600 disabled:opacity-50"
                          aria-label="Delete exercise"
                        >
                          <MdDelete className="text-xl" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 text-lg font-bold">
                      {ex.name
                        .split(" ")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </h3>

                    {(ex.catalog?.category ||
                      ex.catalog?.equipment ||
                      ex.category) && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {(ex.catalog?.category ?? ex.category) && (
                          <span className="rounded-full bg-teal-950/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-teal-300 uppercase">
                            {ex.catalog?.category ?? ex.category}
                          </span>
                        )}
                        {ex.catalog?.equipment && (
                          <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-neutral-300 uppercase">
                            {ex.catalog.equipment}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Sets / reps / volume in one compact row. */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl border border-neutral-800 p-2.5">
                        <p className="text-[11px] text-neutral-400">Sets</p>
                        <p className="text-xl font-bold">{ex.sets || 0}</p>
                      </div>
                      <div className="rounded-xl border border-neutral-800 p-2.5">
                        <p className="text-[11px] text-neutral-400">Reps</p>
                        <p className="text-xl font-bold">{ex.reps || 0}</p>
                      </div>
                      <div className="rounded-xl border border-neutral-800 p-2.5">
                        <p className="text-[11px] text-neutral-400">Volume</p>
                        <p className="text-xl font-bold">
                          {(ex.sets || 0) * (ex.reps || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmSheet
        open={pendingDelete !== null}
        title="Delete this exercise?"
        body={
          pendingDelete
            ? `"${pendingDelete.name}" and its logged sets will be removed.`
            : undefined
        }
        busy={deleteId !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
      />

      <ConfirmSheet
        open={pendingPhotoRemoval !== null}
        title="Remove your photo?"
        body="The stock catalog image will be shown instead."
        confirmLabel="Remove"
        onCancel={() => setPendingPhotoRemoval(null)}
        onConfirm={() =>
          pendingPhotoRemoval && handleRemovePhoto(pendingPhotoRemoval.id)
        }
      />

      {/* Camera sheet — shared by every card */}
      <CameraCapture
        open={photoTarget !== null}
        onClose={() => {
          if (!savingPhoto) setPhotoTarget(null);
        }}
        onCapture={handlePhotoCapture}
        title={photoTarget ? `Photo for ${photoTarget.name}` : "Take a photo"}
        confirmLabel="Save photo"
        saving={savingPhoto}
      />

      {/* Animation Keyframes */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
