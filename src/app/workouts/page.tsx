"use client";

import { useState, useEffect, useCallback } from "react";
import WorkoutDialog from "./workout-dialog";
import { handleError } from "@/components/error-handle";
import LogoLoading from "../logo-loading/page";
import LiftLogMark from "@/components/lift-log-mark";
import ConfirmSheet from "@/components/confirm-sheet";
import { ChevronRight, Trash2, X } from "lucide-react";

interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  /** Working weight in kg, null for bodyweight exercises. */
  weight?: number | null;
}

interface WorkoutExercise {
  exerciseId: number;
  Exercise: Exercise;
}

interface Workout {
  id: number;
  name: string;
  workoutExercises: WorkoutExercise[];
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [open, setOpen] = useState(false);
  const [workout, setWorkout] = useState<Workout>();
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Workout | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{
    workoutId: number;
    exerciseId: number;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/workout");
      if (!res.ok) throw new Error("Failed to fetch workouts");
      const data: Workout[] = await res.json();
      setWorkouts(data || []);
      setStatus("success");
    } catch (error) {
      handleError(error);
      setStatus("error");
      setErrorMessage("Failed to load workouts");
    }
  }, []);

  const viewDetails = useCallback((next: Workout) => {
    setWorkout(next);
    setOpen(true);
  }, []);

  const deleteWorkout = useCallback(async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/workout?id=${pendingDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete workout");
      setWorkouts((prev) => prev.filter((w) => w.id !== pendingDelete.id));
      if (workout?.id === pendingDelete.id) {
        setOpen(false);
        setWorkout(undefined);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, workout?.id]);

  const removeExercise = useCallback(async () => {
    if (!pendingRemove) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/workout?id=${pendingRemove.workoutId}&exerciseId=${pendingRemove.exerciseId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove exercise");
      const drop = (w: Workout): Workout => ({
        ...w,
        workoutExercises: w.workoutExercises.filter(
          (we) =>
            we.exerciseId !== pendingRemove.exerciseId &&
            we.Exercise?.id !== pendingRemove.exerciseId
        ),
      });
      setWorkouts((prev) =>
        prev.map((w) => (w.id === pendingRemove.workoutId ? drop(w) : w))
      );
      setWorkout((prev) =>
        prev && prev.id === pendingRemove.workoutId ? drop(prev) : prev
      );
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
      setPendingRemove(null);
    }
  }, [pendingRemove]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  if (status === "loading" || status === "idle") {
    return <LogoLoading />;
  }

  return (
    <div className="px-4 py-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header
          className="mb-5 flex items-center gap-3"
          aria-label="Workouts header"
        >
          <LiftLogMark className="h-10 w-10 shrink-0 md:h-14 md:w-14" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold md:text-3xl">
              My Workouts
            </h1>
            <p
              className="text-sm text-neutral-400"
              aria-live="polite"
              aria-atomic="true"
            >
              {workouts.length} {workouts.length === 1 ? "workout" : "workouts"}{" "}
              tracked
            </p>
          </div>
        </header>

        <div className="mb-6">
          <WorkoutDialog onWorkoutCreated={fetchWorkouts} />
        </div>

        {status === "error" && (
          <section
            className="mb-6 text-center text-red-400"
            role="alert"
            aria-live="assertive"
          >
            <p>{errorMessage}</p>
            <button
              onClick={fetchWorkouts}
              className="mt-4 h-12 rounded-xl bg-red-600 px-5 font-semibold"
              aria-label="Retry loading workouts"
            >
              Retry
            </button>
          </section>
        )}

        {!errorMessage && workouts.length === 0 && (
          <section
            className="rounded-2xl border border-neutral-800 bg-neutral-950 px-6 py-10 text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            <h3 className="mb-2 text-xl font-bold">No Workouts Yet</h3>
            <p className="mx-auto max-w-md text-sm text-neutral-400">
              Start tracking your fitness journey by adding your first workout
              using the button above!
            </p>
          </section>
        )}

        {!errorMessage && workouts.length > 0 && (
          <section
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="List of workouts"
          >
            {workouts.map((w, index) => (
              <article
                key={w.id}
                className="flex items-stretch rounded-2xl border border-teal-950 shadow-lg backdrop-blur-xl"
                style={{
                  animation: `fadeIn 0.4s ease-out ${Math.min(index, 6) * 0.06}s both`,
                }}
              >
                <button
                  type="button"
                  onClick={() => viewDetails(w)}
                  aria-labelledby={`workout-title-${w.id}`}
                  className="tap-scale min-w-0 flex-1 p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3
                      id={`workout-title-${w.id}`}
                      className="min-w-0 flex-1 text-lg font-semibold tracking-tight"
                    >
                      {w.name}
                    </h3>

                    <span className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap">
                      {w.workoutExercises?.length || 0}{" "}
                      {w.workoutExercises?.length === 1
                        ? "exercise"
                        : "exercises"}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-400">
                    {w.workoutExercises?.length
                      ? w.workoutExercises
                          .map((we) => we.Exercise?.name || "Unnamed Exercise")
                          .join(", ")
                      : "No exercises yet"}
                  </p>

                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-400">
                    View details <ChevronRight className="h-4 w-4" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingDelete(w)}
                  className="touch-target tap-scale m-2 flex shrink-0 items-center justify-center self-center rounded-xl text-neutral-500 active:text-red-400"
                  aria-label={`Delete ${w.name}`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </article>
            ))}
          </section>
        )}
      </div>

      {open && workout && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="scroll-area max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border-t border-neutral-800 bg-neutral-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-lift-gradient sm:max-w-lg sm:rounded-2xl sm:border sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">{workout.name}</h2>
              <button
                className="touch-target tap-scale -mt-1 -mr-1 flex shrink-0 items-center justify-center rounded-full text-neutral-400"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-2 text-sm font-semibold text-neutral-300">
              Exercises
            </p>
            {workout.workoutExercises?.length ? (
              <ul className="space-y-2">
                {workout.workoutExercises.map((we) => {
                  const exerciseId = we.exerciseId ?? we.Exercise.id;
                  return (
                    <li
                      key={`${workout.id}-${exerciseId}`}
                      className="flex items-center gap-2 rounded-xl border border-neutral-800 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{we.Exercise?.name}</p>
                        {(we.Exercise?.sets || we.Exercise?.reps) ? (
                          <p className="text-xs text-neutral-500">
                            {we.Exercise.sets} × {we.Exercise.reps}
                            {we.Exercise.weight != null
                              ? ` · ${we.Exercise.weight} kg`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingRemove({
                            workoutId: workout.id,
                            exerciseId,
                            name: we.Exercise?.name ?? "this exercise",
                          })
                        }
                        className="touch-target tap-scale flex shrink-0 items-center justify-center rounded-xl text-neutral-500 active:text-red-400"
                        aria-label={`Remove ${we.Exercise?.name}`}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">No exercises yet.</p>
            )}

            <button
              type="button"
              onClick={() => setPendingDelete(workout)}
              className="tap-scale mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-900/60 font-semibold text-red-400 active:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
              Delete workout
            </button>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={pendingDelete !== null}
        title="Delete this workout?"
        body={
          pendingDelete
            ? `"${pendingDelete.name}" will be removed. The exercises themselves stay in your library.`
            : undefined
        }
        busy={busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteWorkout}
      />

      <ConfirmSheet
        open={pendingRemove !== null}
        title="Remove this exercise?"
        body={
          pendingRemove
            ? `"${pendingRemove.name}" will be taken off this workout.`
            : undefined
        }
        confirmLabel="Remove"
        busy={busy}
        onCancel={() => setPendingRemove(null)}
        onConfirm={removeExercise}
      />

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
