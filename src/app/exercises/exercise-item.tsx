"use client";

import { useState } from "react";
import Link from "next/link";
import { BiDumbbell } from "react-icons/bi";
import { MdDelete } from "react-icons/md";
import { Camera, ChevronDown, ImageOff, LineChart } from "lucide-react";
import CountStepper from "@/components/count-stepper";
import { exercisePhotoUrl } from "@/lib/image";
import { repVolume, tonnage, type Exercise } from "./exercise-filters";

/** Names are stored as typed ("bench press"); the list always shows them cased. */
function titleCase(name: string) {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** "Chest · Barbell" — what the exercise is, in the space of one line. */
function tagline(ex: Exercise) {
  const parts = [
    ex.catalog?.primaryMuscles?.[0] ?? ex.catalog?.category ?? ex.category,
    ex.catalog?.equipment,
  ].filter(Boolean) as string[];
  return parts.join(" · ");
}

function prescription(ex: Exercise) {
  return `${ex.sets || 0} × ${ex.reps || 0}`;
}

function load(ex: Exercise) {
  return ex.weight ? `${ex.weight} kg` : "Bodyweight";
}

// Reps volume is sets × reps; once a weight is set, the number that matters is
// the tonnage moved (sets × reps × kg).
function volumeLabel(ex: Exercise) {
  const reps = repVolume(ex);
  if (!ex.weight) return `Volume ${reps} reps`;
  const kg = Math.round(tonnage(ex) * 10) / 10;
  return `Volume ${reps} reps · ${kg.toLocaleString()} kg`;
}

function Thumbnail({
  image,
  size,
}: {
  image: string | null;
  size: "sm" | "lg";
}) {
  // A catalog image that 404s (or a photo deleted on another device) would
  // otherwise leave the browser's broken-image glyph in the row.
  const [broken, setBroken] = useState(false);
  const box =
    size === "sm" ? "h-12 w-12 rounded-lg" : "h-full w-full rounded-none";

  if (!image || broken) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-neutral-900 ${box}`}
      >
        <BiDumbbell className="text-xl text-neutral-500" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={`shrink-0 object-cover ${box}`}
    />
  );
}

export interface ExerciseItemProps {
  exercise: Exercise;
  view: "list" | "grid";
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: { sets?: number; reps?: number; weight?: number | null }) => void;
  onTakePhoto: () => void;
  onRemovePhoto: () => void;
  onDelete: () => void;
  deleting: boolean;
}

/**
 * One exercise, collapsed to a single line until it's tapped.
 *
 * The prescription steppers and the photo/delete actions are the bulk of an
 * exercise card, and they're only wanted for the one exercise being edited —
 * so they live behind the row rather than in front of every row at once.
 */
export default function ExerciseItem({
  exercise: ex,
  view,
  expanded,
  onToggle,
  onChange,
  onTakePhoto,
  onRemovePhoto,
  onDelete,
  deleting,
}: ExerciseItemProps) {
  // The user's own photo always wins over the stock catalog image.
  const ownPhoto = exercisePhotoUrl(ex.id, ex.photoUpdatedAt);
  const image = ownPhoto ?? ex.catalog?.images?.[0] ?? null;
  const panelId = `exercise-panel-${ex.id}`;
  const name = titleCase(ex.name);
  const subtitle = tagline(ex);

  const detail = (
    <div id={panelId} className="border-t border-neutral-800 p-3">
      {/* Sets / reps / weight are the prescription — tap +/- to nudge, or type
          straight into the number. Weight gets its own full-width row: it moves
          in 0.5 kg steps (micro plates, dumbbells) and changes most often. */}
      <div className="grid grid-cols-2 gap-2">
        <CountStepper
          label="Sets"
          value={ex.sets || 0}
          onChange={(sets) => onChange({ sets })}
        />
        <CountStepper
          label="Reps"
          value={ex.reps || 0}
          onChange={(reps) => onChange({ reps })}
        />
      </div>
      <div className="mt-2">
        <CountStepper
          label="Weight"
          value={ex.weight ?? 0}
          step={0.5}
          max={1000}
          unit="kg"
          // 0 kg means bodyweight — stored as no weight at all.
          onChange={(weight) => onChange({ weight: weight > 0 ? weight : null })}
        />
      </div>
      <p className="mt-2 text-center text-xs text-neutral-500">
        {volumeLabel(ex)}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {/* The numbers above are today's prescription; this is the history of
            what you've actually put on the bar. */}
        <Link
          href={`/progress?exercise=${encodeURIComponent(ex.name)}`}
          className="tap-scale flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-800 text-sm font-semibold text-neutral-300 active:border-teal-700 active:text-teal-300"
        >
          <LineChart className="h-4 w-4" />
          Progress
        </Link>
        <button
          type="button"
          onClick={onTakePhoto}
          aria-label={ownPhoto ? `Retake photo for ${name}` : `Take a photo for ${name}`}
          className="touch-target tap-scale flex items-center justify-center rounded-xl border border-neutral-800 px-3 text-neutral-300 active:border-teal-700 active:text-teal-300"
        >
          <Camera className="h-5 w-5" />
        </button>
        {ownPhoto && (
          <button
            type="button"
            onClick={onRemovePhoto}
            aria-label={`Remove your photo for ${name}`}
            className="touch-target tap-scale flex items-center justify-center rounded-xl border border-neutral-800 px-3 text-neutral-300 active:border-neutral-600"
          >
            <ImageOff className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Delete ${name}`}
          className="touch-target tap-scale flex items-center justify-center rounded-xl border border-neutral-800 px-3 text-neutral-400 active:border-red-800 active:text-red-400 disabled:opacity-50"
        >
          <MdDelete className="text-xl" />
        </button>
      </div>
    </div>
  );

  const chevron = (
    <ChevronDown
      className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform ${
        expanded ? "rotate-180" : ""
      }`}
    />
  );

  if (view === "grid") {
    return (
      <article className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="tap-scale block w-full text-left"
        >
          <div className="relative aspect-[16/9] overflow-hidden bg-neutral-900">
            <Thumbnail image={image} size="lg" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
            <h3 className="absolute inset-x-3 bottom-2 line-clamp-2 text-base font-bold">
              {name}
            </h3>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <p className="min-w-0 flex-1 truncate text-xs text-neutral-400 capitalize">
              {subtitle || "Custom exercise"}
            </p>
            <p className="shrink-0 text-sm font-semibold tabular-nums">
              {prescription(ex)}
              <span className="ml-1 text-xs font-normal text-neutral-400">
                {load(ex)}
              </span>
            </p>
            {chevron}
          </div>
        </button>
        {expanded && detail}
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="tap-scale flex w-full items-center gap-3 p-2.5 text-left"
      >
        <Thumbnail image={image} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-neutral-400 capitalize">
            {subtitle || "Custom exercise"}
          </p>
        </div>
        {/* A desktop row is wide enough to carry the derived number too,
            rather than leaving half the row empty. */}
        <p className="hidden shrink-0 text-xs text-neutral-500 tabular-nums lg:block">
          {volumeLabel(ex)}
        </p>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold tabular-nums">{prescription(ex)}</p>
          <p className="text-xs text-neutral-400 tabular-nums">{load(ex)}</p>
        </div>
        {chevron}
      </button>
      {expanded && detail}
    </article>
  );
}
