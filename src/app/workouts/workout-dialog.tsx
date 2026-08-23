"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IoMdAdd } from "react-icons/io";
import { MdFitnessCenter } from "react-icons/md";
import { AiOutlineCheckCircle, AiOutlineWarning } from "react-icons/ai";

interface Exercise {
  id: string;
  name: string;
}

interface WorkoutDialogProps {
  onWorkoutCreated?: () => void;
}

export default function WorkoutDialog({ onWorkoutCreated }: WorkoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const res = await fetch("/api/exercise");
        if (!res.ok) throw new Error("Failed to fetch exercises");

        const data = await res.json();

        // Safely extract exercises array from API response
        const exercisesArray = Array.isArray(data.exercises) ? data.exercises : [];
        setExercises(exercisesArray);
      } catch (err) {
        console.error("Error fetching exercises:", err);
        setExercises([]);
      }
    };

    fetchExercises();
  }, []);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleCreateWorkout = async () => {
    if (!name.trim()) {
      showMessage("Workout name is required", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          exercises: selectedExercises,
        }),
      });

      if (!res.ok) throw new Error("Failed to create workout");

      setName("");
      setSelectedExercises([]);
      showMessage("Workout created successfully!", "success");
      onWorkoutCreated?.();

      setTimeout(() => setOpen(false), 1000);
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Something went wrong",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleExercise = (id: string) => {
    setSelectedExercises((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setMessage("");
          setSelectedExercises([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="tap-scale group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl font-semibold shadow-lg transition-all duration-300 md:h-12 md:w-auto md:px-6">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <IoMdAdd className="text-xl relative z-10" />
          <span className="relative z-10">Add Workout</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 border-neutral-800 bg-neutral-950 p-0 shadow-2xl sm:max-w-xl">
        <div className="relative overflow-hidden bg-black p-5 text-white sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-neutral-900/40 rounded-full translate-y-24 -translate-x-24 blur-2xl" />
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-neutral-900 bg-neutral-800 p-3 shadow-lg backdrop-blur-sm sm:p-4">
                <MdFitnessCenter className="text-3xl text-white sm:text-4xl" />
              </div>
              <div className="flex-1">
                <DialogTitle className="mb-1 text-2xl font-bold text-white sm:text-3xl">
                  New Workout
                </DialogTitle>
                <p className="text-sm text-neutral-400 sm:text-base">
                  Track your workouts by creating new routines
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 bg-black p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:p-8">
          <Input
            placeholder="Workout Name"
            enterKeyHint="done"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="border-2 border-neutral-800 focus:border-neutral-200 focus:ring-4 focus:ring-neutral-900 rounded-xl shadow-sm text-white placeholder:text-neutral-500 bg-neutral-950 transition-all h-12 px-4 text-base"
          />

          {/* Exercise selection */}
          <div className="scroll-area max-h-[40dvh] overflow-y-auto border border-neutral-800 rounded-xl p-3 bg-neutral-900">
            {(exercises || []).length > 0 ? (
              (exercises || []).map((ex) => (
                <label
                  key={ex.id}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors active:bg-neutral-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedExercises.includes(ex.id)}
                    onChange={() => toggleExercise(ex.id)}
                    className="h-5 w-5 shrink-0 accent-emerald-500"
                    disabled={loading}
                  />
                  <span className="text-base text-white">{ex.name}</span>
                </label>
              ))
            ) : (
              <p className="text-neutral-400 text-sm">No exercises found</p>
            )}
          </div>

          {message && (
            <div
              className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium shadow-md ${
                messageType === "success"
                  ? "bg-neutral-900 text-green-400 border-2 border-green-900"
                  : "bg-neutral-900 text-red-400 border-2 border-red-900"
              }`}
            >
              {messageType === "success" ? (
                <AiOutlineCheckCircle className="text-xl flex-shrink-0" />
              ) : (
                <AiOutlineWarning className="text-xl flex-shrink-0" />
              )}
              <span>{message}</span>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 border-2 border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700 text-white font-semibold py-3 rounded-xl transition-all text-base h-12 bg-black"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkout}
              disabled={loading || !name.trim()}
              className="flex-1 hover:bg-neutral-800 font-bold py-3 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-base h-12"
            >
              {loading ? "Creating..." : "Save Workout"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
