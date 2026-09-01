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
import { Scale } from "lucide-react";

interface ProgressDialogProps {
  onsuccess?: () => void;
}

interface Workout {
  id: number;
  name: string;
}

/**
 * Logs a body metric — weight on the scale, calories burned — for a day.
 *
 * What you lifted is recorded by sessions, so this dialog deliberately does not
 * ask about sets or exercises. The workout is optional: stepping on a scale on
 * a rest day is still worth logging, and requiring a workout used to block it.
 */
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
      setWorkouts(Array.isArray(data) ? data : []);
    } catch {
      // The workout link is optional — a failed list shouldn't block the log.
      setWorkouts([]);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && e.target instanceof HTMLInputElement) {
      saveProgress();
    }
  };

  const saveProgress = async () => {
    if (!weight && !calories) {
      showMessage("Enter a body weight or calories burned", "error");
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
        throw new Error(err.message || "Failed to save entry");
      }
      showMessage("Saved!", "success");
      resetForm();
      onsuccess?.();
      setTimeout(() => setOpen(false), 900);
    } catch (err: unknown) {
      showMessage(
        err instanceof Error ? err.message : "Error saving entry",
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
        <Button
          variant="outline"
          className="tap-scale h-12 w-full rounded-xl border-neutral-800 font-semibold md:w-auto md:px-5"
        >
          <Scale className="h-4 w-4" />
          Log body weight
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 border-neutral-800 bg-neutral-950 p-0 shadow-2xl sm:max-w-lg">
        <div className="relative overflow-hidden p-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] sm:p-6 sm:pt-6">
          <div className="absolute top-0 right-0 h-64 w-64 translate-x-32 -translate-y-32 rounded-full bg-white/5 blur-3xl" />
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-neutral-900 bg-neutral-800 p-3.5 shadow-lg backdrop-blur-sm">
                <Scale className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <DialogTitle className="mb-1 text-2xl font-bold text-white">
                  Log body weight
                </DialogTitle>
                <DialogDescription className="text-base text-neutral-400">
                  Your lifts are logged by sessions — this is for the scale.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 bg-black p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:p-6">
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            <NumberStepper
              label="Body weight (kg)"
              value={weight}
              onChange={setWeight}
              step={0.5}
              decimal
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
            <NumberStepper
              label="Calories burned"
              value={calories}
              onChange={setCalories}
              step={5}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
          </div>

          {workouts.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-semibold text-white">
                Workout{" "}
                <span className="text-sm font-normal text-neutral-500">
                  optional
                </span>
              </Label>
              <select
                value={selectedWorkout ?? ""}
                onChange={(e) =>
                  setSelectedWorkout(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="h-12 w-full rounded-xl border-2 border-neutral-800 bg-neutral-950 px-4 text-base text-white shadow-sm focus:border-neutral-200"
                disabled={loading}
              >
                <option value="">No workout</option>
                {workouts.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {message && (
            <div
              className={`flex items-center gap-3 rounded-xl p-4 text-sm font-medium shadow-md ${
                messageType === "success"
                  ? "border-2 border-green-900 bg-neutral-900 text-green-400"
                  : "border-2 border-red-900 bg-neutral-900 text-red-400"
              }`}
            >
              {messageType === "success" ? (
                <AiOutlineCheckCircle className="flex-shrink-0 text-xl" />
              ) : (
                <AiOutlineWarning className="flex-shrink-0 text-xl" />
              )}
              <span>{message}</span>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-12 flex-1 rounded-xl border-2 border-neutral-800 bg-black text-base font-semibold text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={saveProgress}
              disabled={loading || (!weight && !calories)}
              className="h-12 flex-1 rounded-xl bg-neutral-900 text-base font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
