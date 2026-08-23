"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import NumberStepper from "@/components/number-stepper";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AiOutlineCheckCircle, AiOutlineWarning } from "react-icons/ai";
import { BiDumbbell } from "react-icons/bi";
import { Circle } from "lucide-react";

interface ProgressDialogProps {
  onsuccess?: () => void;
}

interface Workout {
  id: number;
  name: string;
}

export default function ProgressDialog({ onsuccess }: ProgressDialogProps) {
  const [open, setOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  const fetchWorkouts = useCallback(async () => {
    try {
      const res = await fetch("/api/workout");
      if (!res.ok) throw new Error("Failed to fetch workouts");
      const data = await res.json();
      setWorkouts(data);
    } catch (err: unknown) {
      showMessage(
        err instanceof Error ? err.message : "Error fetching workouts",
        "error"
      );
    }
  }, []);

  useEffect(() => {
    if (open) fetchWorkouts();
  }, [open, fetchWorkouts]);

  const resetForm = () => {
    setSelectedWorkout(null);
    setWeight("");
    setCalories("");
    setMessage("");
  };

  const incrementValue = (
    setter: (v: string) => void,
    currentValue: string,
    step: number = 1
  ) => {
    setter(String((Number(currentValue) || 0) + step));
  };

  const decrementValue = (
    setter: (v: string) => void,
    currentValue: string,
    step: number = 1
  ) => {
    const current = Number(currentValue) || 0;
    if (current - step >= 0) setter(String(current - step));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && e.target instanceof HTMLInputElement) {
      saveProgress();
    }
  };

  const saveProgress = async () => {
    if (!selectedWorkout) {
      showMessage("Workout is required!", "error");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutId: selectedWorkout,
          weight: weight ? parseFloat(weight) : null,
          caloriesBurned: calories ? parseFloat(calories) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save progress");
      }
      showMessage("Progress saved!", "success");
      resetForm();
      onsuccess?.();
      setTimeout(() => setOpen(false), 1200);
    } catch (err: unknown) {
      showMessage(
        err instanceof Error ? err.message : "Error saving progress",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="tap-scale group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl font-semibold shadow-lg transition-all duration-300 md:h-12 md:w-auto md:px-6">
          <div className="absolute inset-0 bg-neutral-900 opacity-0 transition-opacity duration-300" />
          <BiDumbbell className="text-xl relative z-10" />
          <span className="relative z-10">Log Progress</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 border-neutral-800 bg-neutral-950 p-0 shadow-2xl sm:max-w-xl">
        <div className="relative overflow-hidden p-5 sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-neutral-900/40 rounded-full translate-y-24 -translate-x-24 blur-2xl" />
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-neutral-800 p-4 rounded-2xl backdrop-blur-sm border border-neutral-900 shadow-lg">
                <BiDumbbell className="text-4xl text-white" />
              </div>
              <div className="flex-1">
                <DialogTitle className="mb-1 text-2xl font-bold text-white sm:text-3xl">
                  Log Progress
                </DialogTitle>
                <DialogDescription className="text-neutral-400 text-base">
                  Track your workout session
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 bg-black p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:p-8">
          {/* Workout Select */}
          <div className="space-y-2">
            <Label className="font-semibold text-white flex items-center gap-2 text-base">
              <BiDumbbell className="text-neutral-200" />
              Workout <span className="text-red-500">*</span>
            </Label>
            <select
              value={selectedWorkout ?? ""}
              onChange={(e) => setSelectedWorkout(Number(e.target.value))}
              className="h-12 w-full rounded-xl border-2 border-neutral-800 bg-neutral-950 px-4 text-base text-white shadow-sm focus:border-neutral-200"
              disabled={loading}
            >
              <option value="" disabled>
                Select a workout
              </option>
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Weight / Calories */}
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            <NumberStepper
              label="Weight (kg)"
              value={weight}
              onChange={setWeight}
              step={0.5}
              decimal
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
            <NumberStepper
              label="Calories Burned"
              value={calories}
              onChange={setCalories}
              step={5}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium transition-all duration-300 shadow-md ${
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

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 border-2 border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700 text-white font-semibold py-3 rounded-xl transition-all text-base h-12 bg-black"
            >
              Cancel
            </Button>
            <Button
              onClick={saveProgress}
              disabled={loading || !selectedWorkout}
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-base h-12"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <Circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Progress"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
