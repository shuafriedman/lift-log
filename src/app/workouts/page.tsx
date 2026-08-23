"use client";

import { useState, useEffect, useCallback } from "react";
import WorkoutDialog from "./workout-dialog";
import { handleError } from "@/components/error-handle";
import LogoLoading from "../logo-loading/page";
import LiftLogMark from "@/components/lift-log-mark";
import { ChevronRight, X } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
}

interface WorkoutExercise {
  id: string;
  Exercise: Exercise;
}

interface Workout {
  id: string;
  name: string;
  workoutExercises: WorkoutExercise[];
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const [workout, setWorkout] = useState<Workout>();
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
    }
  }, []);

  const viewDetails = useCallback((workout: Workout) => {
    setWorkout(workout);
    setOpen(true)
  }, [])

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  if (status === "loading" || status === "idle") {
    return <LogoLoading />;
  }

  return (
    <div className="px-4 py-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
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

        {/* Error */}
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

        {/* Empty State */}
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

        {/* Workout list */}
        {!errorMessage && workouts.length > 0 && (
          <section
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="List of workouts"
          >
            {workouts.map((w, index) => (
              /* The card itself opens the detail sheet. It used to hide a
                 "View Details" button behind :hover, so on a touch screen
                 there was no way to open a workout at all. */
              <button
                key={w.id}
                type="button"
                onClick={() => viewDetails(w)}
                aria-labelledby={`workout-title-${w.id}`}
                className="tap-scale w-full rounded-2xl border border-teal-950 p-4 text-left shadow-lg backdrop-blur-xl"
                style={{
                  animation: `fadeIn 0.4s ease-out ${Math.min(index, 6) * 0.06}s both`,
                }}
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
                    {w.workoutExercises?.length === 1 ? "exercise" : "exercises"}
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
            ))}
          </section>
        )}
      </div>

      {/* Detail sheet: bottom-anchored on mobile, centred from `sm` up. */}
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
                {workout.workoutExercises.map((we) => (
                  <li
                    key={`${we.id}-${we.Exercise.id}`}
                    className="rounded-xl border border-neutral-800 px-4 py-3"
                  >
                    {we.Exercise?.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">No exercises yet.</p>
            )}
          </div>
        </div>
      )}

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
