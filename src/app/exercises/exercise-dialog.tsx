"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkoutStore } from "@/store/workoutStrore";
import { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdFitnessCenter } from "react-icons/md";
import { AiOutlineCheckCircle, AiOutlineWarning } from "react-icons/ai";
import { BiDumbbell } from "react-icons/bi";
import { FiRepeat } from "react-icons/fi";
import { GiWeightLiftingUp } from "react-icons/gi";
import { Camera, Circle, Library, PenLine, X } from "lucide-react";
import NumberStepper from "@/components/number-stepper";
import ExercisePicker, { type CatalogItem } from "./exercise-picker";
import CameraCapture from "@/components/camera-capture";
import { uploadExercisePhoto, type ProcessedPhoto } from "@/lib/image";

interface ExerciseDialogProps {
  onsuccess?: () => void;
}

export default function ExerciseDialog({ onsuccess }: ExerciseDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"library" | "custom">("library");
  const [name, setName] = useState("");
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [catalogImage, setCatalogImage] = useState<string | null>(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  // Empty means bodyweight — no weight is stored for the exercise.
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  // Photo taken before the exercise exists — uploaded right after it's created.
  const [pendingPhoto, setPendingPhoto] = useState<ProcessedPhoto | null>(null);
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const { workoutId } = useWorkoutStore();

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  // Local preview for the pending photo.
  useEffect(() => {
    if (!pendingPhoto) {
      setPendingPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingPhoto.blob);
    setPendingPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto]);

  const validateInputs = () => {
    if (!name.trim()) {
      showMessage("Exercise name is required", "error");
      return false;
    }
    if (sets && Number(sets) <= 0) {
      showMessage("Sets must be greater than 0", "error");
      return false;
    }
    if (reps && Number(reps) <= 0) {
      showMessage("Reps must be greater than 0", "error");
      return false;
    }
    if (weight && Number(weight) < 0) {
      showMessage("Weight can't be negative", "error");
      return false;
    }
    return true;
  };

  async function addExercise() {
    if (!validateInputs()) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sets: sets ? Number(sets) : 0,
          reps: reps ? Number(reps) : 0,
          weight: weight ? Number(weight) : null,
          catalogId,
          workoutId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save exercise");
      }

      // The exercise has an id now, so any photo taken above can be attached.
      let photoFailed = false;
      if (pendingPhoto && data?.exercise?.id) {
        try {
          await uploadExercisePhoto(data.exercise.id, pendingPhoto);
        } catch {
          photoFailed = true;
        }
      }

      showMessage(
        photoFailed
          ? "Exercise added, but the photo didn't upload. Try again from the card."
          : "Exercise added successfully!",
        photoFailed ? "error" : "success"
      );
      setName("");
      setCatalogId(null);
      setCatalogImage(null);
      setPendingPhoto(null);
      setSets("3");
      setReps("10");
      setWeight("");
      onsuccess?.();
      setTimeout(() => {
        setOpen(false);
        setMessage("");
      }, 1200);
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && e.target instanceof HTMLInputElement) {
      addExercise();
    }
  };

  const resetForm = () => {
    setName("");
    setCatalogId(null);
    setCatalogImage(null);
    setPendingPhoto(null);
    setCameraOpen(false);
    setSets("3");
    setReps("10");
    setWeight("");
    setMessage("");
    setMode("library");
  };

  const handleSelectCatalog = (item: CatalogItem) => {
    setName(item.name);
    setCatalogId(item.id);
    setCatalogImage(item.images?.[0] ?? null);
  };

  const clearSelection = () => {
    setName("");
    setCatalogId(null);
    setCatalogImage(null);
  };

  // Custom names are typed straight in, so the rest of the form is useful from
  // the start; from the library it only makes sense once something is picked.
  const showDetails = mode === "custom" || catalogId != null;

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
          <IoMdAdd className="text-xl relative z-10" />
          <span className="relative z-10">Add Exercise</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 border-neutral-800 bg-neutral-950 p-0 shadow-2xl sm:max-w-xl">
        <div className="px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 relative overflow-hidden sm:pt-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-neutral-800 p-2.5 rounded-xl backdrop-blur-sm border border-neutral-900 shadow-lg">
                <MdFitnessCenter className="text-2xl text-white" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold text-white">
                  Add New Exercise
                </DialogTitle>
                <DialogDescription className="text-neutral-400 text-sm">
                  Pick from the library or add your own
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-1 space-y-4 bg-black">
          {/* Source toggle: pick from the shared library or type a custom name */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode("library");
                clearSelection();
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "library"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Library className="h-4 w-4" />
              From library
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("custom");
                clearSelection();
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "custom"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <PenLine className="h-4 w-4" />
              Custom
            </button>
          </div>

          {mode === "library" ? (
            catalogId ? (
              // Selected preview
              <div className="flex items-center gap-4 p-3 rounded-xl border border-teal-800 bg-teal-950/30">
                <div className="h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800 flex items-center justify-center">
                  {catalogImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={catalogImage}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BiDumbbell className="text-neutral-500 text-2xl" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-teal-400 font-semibold uppercase tracking-wide">
                    Selected
                  </p>
                  <p className="text-white font-bold truncate">{name}</p>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  aria-label="Clear selection"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <ExercisePicker
                onSelect={handleSelectCatalog}
                selectedId={catalogId}
              />
            )
          ) : (
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="font-semibold text-white flex items-center gap-2 text-base"
              >
                <BiDumbbell className="text-neutral-200" />
                Exercise Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Bench Press, Squats, Deadlift"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-2 border-neutral-800 focus:border-neutral-200 focus:ring-4 focus:ring-neutral-900 rounded-xl shadow-sm text-white placeholder:text-neutral-500 bg-neutral-950 transition-all h-12 text-base px-4"
                disabled={loading}
                autoFocus
              />
            </div>
          )}

          {/* Browsing the library, the picker is its own scroll area and fills
              a phone screen — everything below it is out of reach. So the
              photo and the numbers only appear once an exercise is picked. */}
          {showDetails && (
            <>
          {/* Your own photo — optional, replaces the stock catalog image */}
          <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900 flex items-center justify-center">
              {pendingPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pendingPhotoUrl}
                  alt="Your photo"
                  className="h-full w-full object-cover"
                />
              ) : catalogImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={catalogImage}
                  alt={name}
                  className="h-full w-full object-cover opacity-50"
                />
              ) : (
                <Camera className="h-6 w-6 text-neutral-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {pendingPhoto ? "Your photo" : "Add a photo"}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {pendingPhoto ? "Saved with the exercise" : "Optional"}
              </p>
            </div>
            {pendingPhoto && (
              <button
                type="button"
                onClick={() => setPendingPhoto(null)}
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                aria-label="Remove photo"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              disabled={loading}
              className="flex h-11 flex-shrink-0 items-center gap-2 rounded-xl bg-neutral-800 px-3 sm:px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 active:bg-neutral-700 disabled:opacity-50"
              aria-label={pendingPhoto ? "Retake photo" : "Take a photo"}
            >
              <Camera className="h-5 w-5" />
              <span className="hidden sm:inline">
                {pendingPhoto ? "Retake" : "Camera"}
              </span>
            </button>
          </div>

          {/* Sets / reps stack on a narrow phone so each stepper keeps its
              full-size buttons instead of squeezing to ~30px wide. */}
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            <NumberStepper
              id="sets"
              label="Sets"
              icon={<FiRepeat className="text-neutral-200" />}
              placeholder="3"
              value={sets}
              onChange={setSets}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
            <NumberStepper
              id="reps"
              label="Reps"
              icon={<FiRepeat className="text-neutral-200" />}
              placeholder="10"
              value={reps}
              onChange={setReps}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
          </div>

          {/* Working weight — 0.5 kg steps, or type the number straight in.
              Leave it empty for bodyweight exercises. */}
          <NumberStepper
            id="weight"
            label="Weight (kg)"
            icon={<GiWeightLiftingUp className="text-neutral-200" />}
            placeholder="Bodyweight"
            value={weight}
            onChange={setWeight}
            onKeyDown={handleKeyPress}
            decimal
            step={0.5}
            max={1000}
            disabled={loading}
          />
            </>
          )}

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
              onClick={addExercise}
              disabled={loading || !name.trim()}
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
                "Save Exercise"
              )}
            </Button>
          </div>
        </div>

        <CameraCapture
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onCapture={(photo) => {
            setPendingPhoto(photo);
            setCameraOpen(false);
          }}
          title={name ? `Photo for ${name}` : "Take a photo"}
        />
      </DialogContent>
    </Dialog>
  );
}
