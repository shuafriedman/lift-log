"use client";

import { useState, useEffect, useCallback } from "react";
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
import { FiSearch } from "react-icons/fi";
import { Library, PenLine, X, ArrowLeft, Plus } from "lucide-react";
import { BiDumbbell } from "react-icons/bi";
import ExercisePicker, {
  type CatalogItem,
} from "@/app/exercises/exercise-picker";

interface LibraryExercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  catalog?: { images: string[] } | null;
}

interface AddExerciseDialogProps {
  sessionId: number;
  onAdded: () => void;
}

export default function AddExerciseDialog({
  sessionId,
  onAdded,
}: AddExerciseDialogProps) {
  const [open, setOpen] = useState(false);
  // "mine" logs an exercise already in My Exercises; "new" adds one to My
  // Exercises (from the catalog or custom) and logs it in one go.
  const [mode, setMode] = useState<"mine" | "new">("mine");
  const [newSource, setNewSource] = useState<"catalog" | "custom">("catalog");

  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<LibraryExercise | null>(null);
  const [name, setName] = useState("");
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [catalogImage, setCatalogImage] = useState<string | null>(null);

  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLibrary = useCallback(async () => {
    try {
      setLibraryLoading(true);
      const res = await fetch("/api/exercise");
      if (!res.ok) return;
      const data = await res.json();
      setLibrary(Array.isArray(data.exercises) ? data.exercises : []);
    } catch {
      setLibrary([]);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadLibrary();
  }, [open, loadLibrary]);

  const reset = () => {
    setMode("mine");
    setNewSource("catalog");
    setQuery("");
    setSelected(null);
    setName("");
    setCatalogId(null);
    setCatalogImage(null);
    setSets("");
    setReps("");
    setWeight("");
    setError("");
  };

  const pickMine = (ex: LibraryExercise) => {
    setSelected(ex);
    setName(ex.name);
    setSets(String(ex.sets ?? ""));
    setReps(String(ex.reps ?? ""));
    setError("");
  };

  const clearSelected = () => {
    setSelected(null);
    setName("");
    setSets("");
    setReps("");
  };

  const pickCatalog = (item: CatalogItem) => {
    setName(item.name);
    setCatalogId(item.id);
    setCatalogImage(item.images?.[0] ?? null);
  };

  const clearCatalog = () => {
    setName("");
    setCatalogId(null);
    setCatalogImage(null);
  };

  const goToNew = () => {
    clearSelected();
    setMode("new");
    setNewSource("catalog");
    setError("");
  };

  const goToMine = () => {
    setMode("mine");
    clearCatalog();
    setError("");
  };

  const matches = query.trim()
    ? library.filter((e) =>
        e.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : library;

  const handleAdd = async () => {
    if (!name.trim()) {
      setError(
        mode === "mine"
          ? "Pick an exercise from My Exercises"
          : "Exercise name is required"
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/session/${sessionId}/exercise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          exerciseId: mode === "mine" ? selected?.id ?? null : null,
          catalogId: mode === "new" ? catalogId : null,
          sets: sets === "" ? null : Number(sets),
          reps: reps === "" ? null : Number(reps),
          weight: weight === "" ? null : Number(weight),
          // A brand-new exercise always lands in My Exercises too.
          saveToLibrary: mode === "new",
        }),
      });
      if (!res.ok) throw new Error("Failed to add exercise");
      reset();
      onAdded();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = mode === "mine" ? selected != null : name.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="tap-scale flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-500 md:h-12 md:flex-none md:px-5">
          <IoMdAdd className="text-xl" /> Add exercise
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 border-neutral-800 bg-neutral-950 p-0 shadow-2xl sm:max-w-md">
        <div className="bg-black p-5 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-neutral-800 p-3 rounded-2xl border border-neutral-900">
                <MdFitnessCenter className="text-2xl text-emerald-400" />
              </div>
              <DialogTitle className="text-2xl font-bold text-white">
                {mode === "mine" ? "Log an Exercise" : "Add a New Exercise"}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 bg-black p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:p-6">
          {mode === "mine" ? (
            selected ? (
              // Selected exercise from My Exercises
              <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-800 bg-emerald-950/30">
                <div className="h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800 flex items-center justify-center">
                  {selected.catalog?.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.catalog.images[0]}
                      alt={selected.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BiDumbbell className="text-neutral-500 text-2xl" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">
                    From My Exercises
                  </p>
                  <p className="text-white font-bold truncate">
                    {selected.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelected}
                  className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  aria-label="Clear selection"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    My Exercises
                  </p>
                  <span className="text-xs text-neutral-500">
                    {library.length} saved
                  </span>
                </div>

                {library.length > 0 && (
                  <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <Input
                      placeholder="Search My Exercises…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="border-2 border-neutral-800 focus:border-emerald-600 rounded-xl text-white placeholder:text-neutral-500 bg-neutral-950 h-12 pl-11"
                    />
                  </div>
                )}

                <div className="scroll-area max-h-[45dvh] space-y-2 overflow-y-auto pr-1">
                  {libraryLoading && library.length === 0 ? (
                    <p className="text-center text-neutral-500 py-8 text-sm">
                      Loading your exercises…
                    </p>
                  ) : library.length === 0 ? (
                    <div className="text-center py-8 px-4 border border-dashed border-neutral-800 rounded-xl">
                      <BiDumbbell className="text-neutral-600 text-3xl mx-auto mb-3" />
                      <p className="text-white font-semibold">
                        No exercises yet
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Add one to My Exercises to log it here.
                      </p>
                    </div>
                  ) : matches.length === 0 ? (
                    <div className="text-center py-8 px-4 text-sm text-neutral-500">
                      Nothing in My Exercises matches &ldquo;{query.trim()}
                      &rdquo;.
                    </div>
                  ) : (
                    matches.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => pickMine(ex)}
                        className="w-full flex items-center gap-3 p-2 rounded-xl border border-neutral-800 hover:border-emerald-700 hover:bg-neutral-900 text-left transition-all"
                      >
                        <div className="h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800 flex items-center justify-center">
                          {ex.catalog?.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ex.catalog.images[0]}
                              alt={ex.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <BiDumbbell className="text-neutral-500 text-xl" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-semibold truncate">
                            {ex.name}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {ex.sets} × {ex.reps}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={goToNew}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-neutral-700 text-sm font-semibold text-neutral-300 hover:text-white hover:border-emerald-700 hover:bg-neutral-900 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add a new exercise
                </button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={goToMine}
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to My Exercises
              </button>

              <p className="text-xs text-neutral-500">
                This is saved to My Exercises and logged in this session.
              </p>

              {/* Source for the new exercise: shared catalog or a custom name */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setNewSource("catalog");
                    clearCatalog();
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    newSource === "catalog"
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <Library className="h-4 w-4" />
                  From catalog
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewSource("custom");
                    clearCatalog();
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    newSource === "custom"
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <PenLine className="h-4 w-4" />
                  Custom
                </button>
              </div>

              {newSource === "catalog" ? (
                catalogId ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-800 bg-emerald-950/30">
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
                      <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">
                        Selected
                      </p>
                      <p className="text-white font-bold truncate">{name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearCatalog}
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      aria-label="Clear selection"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <ExercisePicker onSelect={pickCatalog} selectedId={catalogId} />
                )
              ) : (
                <Input
                  placeholder="Exercise name (e.g. Bench Press)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  autoFocus
                  className="border-2 border-neutral-800 focus:border-emerald-600 rounded-xl text-white placeholder:text-neutral-500 bg-neutral-950 h-12 px-4"
                />
              )}
            </div>
          )}

          {/* Sets / reps / weight for this log entry */}
          {(mode === "new" || selected) && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  Sets
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  disabled={loading}
                  className="h-12 rounded-xl border-2 border-neutral-800 bg-neutral-950 px-3 text-center text-lg text-white focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  Reps
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  disabled={loading}
                  className="h-12 rounded-xl border-2 border-neutral-800 bg-neutral-950 px-3 text-center text-lg text-white focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  Weight
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={loading}
                  className="h-12 rounded-xl border-2 border-neutral-800 bg-neutral-950 px-3 text-center text-lg text-white focus:border-emerald-600"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-12 flex-1 rounded-xl border-2 border-neutral-800 bg-black font-semibold text-white hover:bg-neutral-900"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={loading || !canSubmit}
              className="h-12 flex-1 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Adding…" : mode === "new" ? "Save & Add" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
