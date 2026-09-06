"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import ExerciseDialog from "./exercise-dialog";
import ExerciseItem from "./exercise-item";
import ExercisesToolbar from "./exercises-toolbar";
import {
  isSortKey,
  muscleFacets,
  visibleExercises,
  type Exercise,
  type SortKey,
} from "./exercise-filters";
import { handleError } from "@/components/error-handle";
import { MdFitnessCenter } from "react-icons/md";
import { BiDumbbell } from "react-icons/bi";
import { AiOutlineCheckCircle } from "react-icons/ai";
import CameraCapture from "@/components/camera-capture";
import { uploadExercisePhoto, type ProcessedPhoto } from "@/lib/image";
import LogoLoading from "../logo-loading/page";
import ConfirmSheet from "@/components/confirm-sheet";
import LiftLogMark from "@/components/lift-log-mark";

export type { Exercise };

/** View and sort are per-device preferences, not worth a round trip. */
const VIEW_KEY = "liftlog:exercises:view";
const SORT_KEY = "liftlog:exercises:sort";

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

  // Browsing controls.
  const [query, setQuery] = useState("");
  const [muscles, setMuscles] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"list" | "grid">("list");
  // Only one exercise is edited at a time, so only one card carries the weight
  // of the steppers and actions.
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Stored preferences are read after mount so the server-rendered markup and
  // the first client render still agree.
  useEffect(() => {
    try {
      const storedView = localStorage.getItem(VIEW_KEY);
      if (storedView === "list" || storedView === "grid") setView(storedView);
      const storedSort = localStorage.getItem(SORT_KEY);
      if (isSortKey(storedSort)) setSort(storedSort);
    } catch {
      /* private mode / storage disabled — the defaults are fine */
    }
  }, []);

  const remember = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* nothing to do: the preference just won't survive a reload */
    }
  };

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

  const saveTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const persistPrescription = (
    id: number,
    sets: number,
    reps: number,
    weight: number | null
  ) => {
    const prev = saveTimers.current.get(id);
    if (prev) clearTimeout(prev);
    saveTimers.current.set(
      id,
      setTimeout(async () => {
        try {
          const res = await fetch("/api/exercise", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, sets, reps, weight }),
          });
          if (!res.ok) throw new Error("Failed to update exercise");
        } catch (error) {
          const err = handleError(error);
          setError(
            typeof err === "string" ? err : "Could not save sets/reps/weight."
          );
          try {
            const refresh = await fetch("/api/exercise");
            const data = await refresh.json();
            const list = Array.isArray(data) ? data : data.exercises;
            if (Array.isArray(list)) setExercises(list);
          } catch {
            /* keep the optimistic values if the refetch also fails */
          }
        }
      }, 350)
    );
  };

  const updatePrescription = (
    id: number,
    patch: { sets?: number; reps?: number; weight?: number | null }
  ) => {
    const current = exercises.find((ex) => ex.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    setExercises((prev) => prev.map((ex) => (ex.id === id ? next : ex)));
    persistPrescription(id, next.sets, next.reps, next.weight ?? null);
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
    const timers = saveTimers.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const facets = useMemo(() => muscleFacets(exercises), [exercises]);

  // Sorting an editable list on every keystroke of a stepper would reshuffle
  // the row under the user's thumb, so the order is recomputed from the
  // controls and the fetched list only.
  const shown = useMemo(
    () => visibleExercises(exercises, { query, muscles, sort }),
    [exercises, query, muscles, sort]
  );

  // A chip that no longer matches anything (its last exercise was deleted or
  // renamed) would otherwise strand the list on an empty result.
  useEffect(() => {
    const available = new Set(facets.map((f) => f.value));
    setMuscles((prev) => {
      const next = prev.filter((m) => available.has(m));
      return next.length === prev.length ? prev : next;
    });
  }, [facets]);

  const filtersActive = query.trim() !== "" || muscles.length > 0;

  const clearFilters = () => {
    setQuery("");
    setMuscles([]);
  };

  const toggleMuscle = (value: string) =>
    setMuscles((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]
    );

  if (loading) {
    return <LogoLoading />;
  }

  return (
    <div className="px-4 py-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* The mobile app bar already says "Exercises", so the page only
            repeats the title from md up, where there is room for it. */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="hidden min-w-0 items-center gap-3 md:flex">
            <LiftLogMark className="h-12 w-12 shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold">My Exercises</h1>
              <p className="text-sm text-neutral-400">
                Your library of lifts and their working numbers
              </p>
            </div>
          </div>
          <div className="w-full md:w-auto">
            <ExerciseDialog onsuccess={fetchExercises} />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border-2 border-red-800 p-4 dark:bg-neutral-950">
            <MdFitnessCenter className="shrink-0 text-xl text-red-500" />
            <p className="font-medium text-red-500">{error}</p>
          </div>
        )}

        {exercises.length > 0 && (
          <ExercisesToolbar
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={(value) => {
              setSort(value);
              remember(SORT_KEY, value);
            }}
            view={view}
            onViewChange={(value) => {
              setView(value);
              remember(VIEW_KEY, value);
            }}
            facets={facets}
            selectedMuscles={muscles}
            onToggleMuscle={toggleMuscle}
            filtersActive={filtersActive}
            onClearFilters={clearFilters}
            shown={shown.length}
            total={exercises.length}
          />
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

        {exercises.length > 0 && shown.length === 0 && (
          <div className="rounded-2xl border border-neutral-800 px-6 py-10 text-center">
            <h3 className="mb-2 text-lg font-bold">No matching exercises</h3>
            <p className="mx-auto mb-5 max-w-md text-sm text-neutral-400">
              Nothing here matches those filters. Try a different search, or
              clear them to see all {exercises.length}.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="tap-scale h-11 rounded-xl border border-neutral-800 px-5 font-semibold text-teal-300"
            >
              Clear filters
            </button>
          </div>
        )}

        {shown.length > 0 && (
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-2"
            }
          >
            {shown.map((ex) => (
              <ExerciseItem
                key={ex.id}
                exercise={ex}
                view={view}
                expanded={expandedId === ex.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === ex.id ? null : ex.id))
                }
                onChange={(patch) => updatePrescription(ex.id, patch)}
                onTakePhoto={() => setPhotoTarget(ex)}
                onRemovePhoto={() => setPendingPhotoRemoval(ex)}
                onDelete={() => setPendingDelete(ex)}
                deleting={deleteId === ex.id}
              />
            ))}
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
    </div>
  );
}
