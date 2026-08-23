"use client";

import { useState, useEffect } from "react";
import ExerciseDialog from "./exercise-dialog";
import { handleError } from "@/components/error-handle";
import { MdFitnessCenter, MdDelete } from "react-icons/md";
import { FiRepeat } from "react-icons/fi";
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
    if (!confirm("Are you sure you want to delete this exercise?")) return;

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
    if (!confirm("Remove your photo for this exercise?")) return;
    try {
      const res = await fetch(`/api/exercise/${id}/photo`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove photo");
      setExercises((prev) =>
        prev.map((ex) => (ex.id === id ? { ...ex, photoUpdatedAt: null } : ex))
      );
    } catch (error) {
      const err = handleError(error);
      setError(typeof err === "string" ? err : "Could not remove the photo.");
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  if (loading) {
    return <LogoLoading />
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="dark:bg-neutral-950 rounded-2xl shadow-lift-gradient p-6 md:p-8 mb-8 border border-neutral-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <svg
                width="70"
                height="70"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="liftlogGradient"
                    x1="0"
                    y1="0"
                    x2="64"
                    y2="64"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="50%" stopColor="#5eead4" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>

                <path
                  d="M10 26H6V38H10V26ZM18 22H14V42H18V22ZM26 30V26H22V38H26V34H36L30 40L34 44L48 30L34 16L30 20L36 26H26ZM50 22H46V42H50V22ZM58 26H54V38H58V26Z"
                  fill="url(#liftlogGradient)"
                />
              </svg>
              <div>
                <h1 className="text-3xl font-bold ">My Exercises</h1>
                <p className="text-neutral-400 mt-1">
                  {exercises.length}{" "}
                  {exercises.length === 1 ? "exercise" : "exercises"} tracked
                </p>
              </div>
            </div>
            <ExerciseDialog onsuccess={fetchExercises} />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="dark:bg-neutral-950 border-2 border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="bg-neutral-800 p-2 rounded-lg">
              <MdFitnessCenter className="text-red-500 text-xl" />
            </div>
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {exercises.length === 0 && !loading && !error && (
          <div className=" rounded-2xl shadow-xl p-12 text-center border border-neutral-800">
            <div className=" w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <BiDumbbell className="text-5xl " />
            </div>
            <h3 className="text-2xl font-bold  mb-3">No Exercises Yet</h3>
            <p className="mb-6 max-w-md mx-auto">
              Start tracking your fitness journey by adding your first exercise
              using the button above!
            </p>
            <div className="flex items-center justify-center gap-2 ">
              <AiOutlineCheckCircle className="text-xl" />
              <span className="font-medium">
                Click &quot;Add Exercise&quot; to begin
              </span>
            </div>
          </div>
        )}

        {/* Exercise Grid */}
        {exercises.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercises.map((ex, index) => {
              // The user's own photo always wins over the stock catalog image.
              const ownPhoto = exercisePhotoUrl(ex.id, ex.photoUpdatedAt);
              const image = ownPhoto ?? ex.catalog?.images?.[0] ?? null;
              return (
              <div
                key={ex.id}
                className="relative group rounded-2xl backdrop-blur-xl border border-teal-950 shadow-lg hover:shadow-black/50 dark:hover:shadow-teal-500 transition-all duration-500 overflow-hidden p-[1px]"
                style={{
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                }}
              >
                {/* Card Header — your photo, or the catalog image as a backdrop */}
                <div
                  className={`relative overflow-hidden ${
                    ownPhoto ? "aspect-[4/3] p-4" : "p-6"
                  }`}
                >
                  {image && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={ex.name}
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                          ownPhoto
                            ? "opacity-100"
                            : "opacity-40 group-hover:opacity-60"
                        }`}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
                    </>
                  )}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="p-3 rounded-xl backdrop-blur-sm bg-black/30">
                      <BiDumbbell className="text-2xl" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPhotoTarget(ex)}
                        className="bg-black/40 hover:bg-teal-600 active:bg-teal-600 p-2.5 rounded-lg backdrop-blur-sm transition-all duration-200"
                        title={ownPhoto ? "Retake photo" : "Take a photo"}
                        aria-label={ownPhoto ? "Retake photo" : "Take a photo"}
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                      {ownPhoto && (
                        <button
                          onClick={() => handleRemovePhoto(ex.id)}
                          className="bg-black/40 hover:bg-neutral-700 active:bg-neutral-700 p-2.5 rounded-lg backdrop-blur-sm transition-all duration-200"
                          title="Remove your photo"
                          aria-label="Remove your photo"
                        >
                          <ImageOff className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(ex.id)}
                        disabled={deleteId === ex.id}
                        className="bg-black/40 hover:bg-red-600 active:bg-red-600 p-2.5 rounded-lg backdrop-blur-sm transition-all duration-200 disabled:opacity-50"
                        title="Delete exercise"
                        aria-label="Delete exercise"
                      >
                        <MdDelete className="text-lg" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 line-clamp-2">
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
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(ex.catalog?.category ?? ex.category) && (
                        <span className="inline-block bg-teal-950/60 text-teal-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                          {ex.catalog?.category ?? ex.category}
                        </span>
                      )}
                      {ex.catalog?.equipment && (
                        <span className="inline-block bg-neutral-800 text-neutral-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                          {ex.catalog.equipment}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className=" rounded-xl p-4 border border-neutral-800">
                      <div className="flex items-center gap-2 mb-1">
                        <FiRepeat className="text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-400">
                          Sets
                        </span>
                      </div>
                      <p className="text-2xl font-bold ">{ex.sets || 0}</p>
                    </div>
                    <div className=" rounded-xl p-4 border border-neutral-800">
                      <div className="flex items-center gap-2 mb-1">
                        <FiRepeat className="text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-400">
                          Reps
                        </span>
                      </div>
                      <p className="text-2xl font-bold ">{ex.reps || 0}</p>
                    </div>
                  </div>
                  {/* Total Volume */}
                  {ex.sets > 0 && ex.reps > 0 && (
                    <div className="mt-4 pt-4 border-t border-neutral-800">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-neutral-400">
                          Total Volume
                        </span>
                        <span className="text-lg font-bold ">
                          {ex.sets * ex.reps} Lifts
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
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
