"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { handleError } from "@/components/error-handle";
import LogoLoading from "../../logo-loading/page";
import AddExerciseDialog from "./add-exercise-dialog";
import { CheckCircle2, Trash2, Dumbbell, LineChart } from "lucide-react";
import ConfirmSheet from "@/components/confirm-sheet";
import NumberStepper from "@/components/number-stepper";

interface SessionEntry {
  id: number;
  name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  /** Set when this entry came from My Exercises — offered as a default at finish. */
  exerciseId?: number | null;
  catalog?: { images: string[] } | null;
}

interface WorkoutSession {
  id: number;
  name: string | null;
  startedAt: string;
  endedAt: string | null;
  entries: SessionEntry[];
}

interface ExerciseValues {
  sets: number | null;
  reps: number | null;
  weight: number | null;
}

// An exercise whose logged values drifted from the saved default this session.
interface PendingChange {
  exerciseId: number;
  name: string;
  logged: ExerciseValues;
  current: ExerciseValues;
}

// "3 × 10 · 40 kg" style summary for a set of values.
function summarize(v: ExerciseValues): string {
  const shape =
    v.sets != null && v.reps != null
      ? `${v.sets} × ${v.reps}`
      : v.sets != null
      ? `${v.sets} sets`
      : v.reps != null
      ? `${v.reps} reps`
      : null;
  return (
    [shape, v.weight != null ? `${v.weight} kg` : null]
      .filter(Boolean)
      .join(" · ") || "—"
  );
}

function useElapsed(startISO: string | undefined, endISO: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startISO || endISO) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startISO, endISO]);

  if (!startISO) return "0:00";
  const end = endISO ? new Date(endISO).getTime() : now;
  const secs = Math.max(
    0,
    Math.floor((end - new Date(startISO).getTime()) / 1000)
  );
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">(
    "loading"
  );
  const [finishing, setFinishing] = useState(false);
  const [checkingChanges, setCheckingChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[] | null>(
    null
  );
  // exerciseId -> true means "save this as my new default" (off = local only).
  const [saveDefaults, setSaveDefaults] = useState<Record<number, boolean>>({});
  const [nameDraft, setNameDraft] = useState("");
  const [pendingRemove, setPendingRemove] = useState<SessionEntry | null>(null);
  const [pendingDeleteSession, setPendingDeleteSession] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<SessionEntry | null>(null);
  const [editSets, setEditSets] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${id}`);
      if (res.status === 404) {
        setStatus("error");
        return;
      }
      if (!res.ok) throw new Error("Failed to load session");
      const data = await res.json();
      setSession(data.session);
      setNameDraft(data.session?.name ?? "");
      setStatus("ready");
    } catch (error) {
      handleError(error);
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const elapsed = useElapsed(session?.startedAt, session?.endedAt ?? null);
  const isActive = session != null && session.endedAt === null;

  // Keep the screen awake while a session is running — a phone that sleeps
  // between sets means unlocking with chalky hands to log the next one.
  useEffect(() => {
    if (!isActive || typeof navigator === "undefined") return;
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Denied (low battery, unsupported) — the session still works fine.
      }
    };

    // Android drops the lock whenever the tab is backgrounded; re-take it.
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [isActive]);

  const saveName = useCallback(async () => {
    if (!session || nameDraft === (session.name ?? "")) return;
    try {
      await fetch(`/api/session/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft }),
      });
    } catch (error) {
      handleError(error);
    }
  }, [id, nameDraft, session]);

  const removeEntry = useCallback(
    async (entryId: number) => {
      setDeleting(true);
      try {
        const res = await fetch(
          `/api/session/${id}/exercise?entryId=${entryId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to remove exercise");
        setPendingRemove(null);
        fetchSession();
      } catch (error) {
        handleError(error);
      } finally {
        setDeleting(false);
      }
    },
    [id, fetchSession]
  );

  const deleteSession = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/session/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      router.push("/sessions");
    } catch (error) {
      handleError(error);
      setDeleting(false);
      setPendingDeleteSession(false);
    }
  }, [id, router]);

  const openEdit = (entry: SessionEntry) => {
    setEditing(entry);
    setEditSets(entry.sets != null ? String(entry.sets) : "");
    setEditReps(entry.reps != null ? String(entry.reps) : "");
    setEditWeight(entry.weight != null ? String(entry.weight) : "");
  };

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/session/${id}/exercise`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: editing.id,
          sets: editSets === "" ? null : Number(editSets),
          reps: editReps === "" ? null : Number(editReps),
          weight: editWeight === "" ? null : Number(editWeight),
        }),
      });
      if (!res.ok) throw new Error("Failed to update exercise");
      setEditing(null);
      fetchSession();
    } catch (error) {
      handleError(error);
    } finally {
      setSavingEdit(false);
    }
  }, [editing, editSets, editReps, editWeight, id, fetchSession]);

  // Commit the finish, optionally promoting some exercises to new defaults.
  const doFinish = useCallback(
    async (updateDefaults: number[]) => {
      setFinishing(true);
      try {
        const res = await fetch(`/api/session/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "finish", updateDefaults }),
        });
        if (!res.ok) throw new Error("Failed to finish session");
        router.push("/sessions");
      } catch (error) {
        handleError(error);
        setFinishing(false);
      }
    },
    [id, router]
  );

  // Tapping Finish first checks whether anything drifted from the user's
  // defaults. If so, we ask per exercise before committing; if not, we finish
  // straight away.
  const finishSession = useCallback(async () => {
    setCheckingChanges(true);
    try {
      const res = await fetch(`/api/session/${id}/changes`);
      if (!res.ok) throw new Error("Failed to check for changes");
      const data = await res.json();
      const changes: PendingChange[] = data.changes ?? [];
      if (changes.length === 0) {
        await doFinish([]);
        return;
      }
      setSaveDefaults({});
      setPendingChanges(changes);
    } catch (error) {
      handleError(error);
    } finally {
      setCheckingChanges(false);
    }
  }, [id, doFinish]);

  const confirmFinishWithChanges = useCallback(async () => {
    const updateDefaults = (pendingChanges ?? [])
      .filter((c) => saveDefaults[c.exerciseId])
      .map((c) => c.exerciseId);
    setPendingChanges(null);
    await doFinish(updateDefaults);
  }, [pendingChanges, saveDefaults, doFinish]);

  if (status === "loading") return <LogoLoading />;

  if (status === "error" || !session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <p className="text-neutral-400">Session not found.</p>
        <Button onClick={() => router.push("/sessions")}>
          Back to sessions
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:p-8">
      {/* Room for the pinned action bar on mobile. */}
      <div className="mx-auto max-w-3xl pb-28 md:pb-0">
        {/* Header: the running clock is the hero — it has to be readable from
            arm's length with the phone propped on a bench. */}
        <header className="mb-5 rounded-2xl border border-neutral-800 p-4 shadow-lift-gradient md:p-6">
          <div
            className={`font-mono text-5xl font-bold tabular-nums md:text-6xl ${
              isActive ? "text-emerald-400" : "text-neutral-300"
            }`}
          >
            {elapsed}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {isActive ? "● in progress" : "completed"} ·{" "}
            {new Date(session.startedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <div className="mt-4">
            {isActive ? (
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                placeholder="Name this session (optional)"
                enterKeyHint="done"
                className="h-11 w-full border-b border-neutral-800 bg-transparent text-xl font-bold outline-none placeholder:text-neutral-600 focus:border-neutral-600 md:text-2xl"
              />
            ) : (
              <h2 className="text-xl font-bold md:text-2xl">
                {session.name ||
                  new Date(session.startedAt).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
              </h2>
            )}
          </div>
        </header>

        {/* Logged exercises */}
        {session.entries.length === 0 ? (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950 px-6 py-10 text-center">
            <Dumbbell className="mx-auto mb-4 h-10 w-10 text-neutral-500" />
            <h3 className="mb-2 text-lg font-bold">No exercises logged yet</h3>
            <p className="text-sm text-neutral-400">
              {isActive
                ? "Add your first exercise to start logging this session."
                : "This session had no logged exercises."}
            </p>
          </section>
        ) : (
          <section className="space-y-2.5">
            {session.entries.map((entry, i) => (
              <article
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3"
              >
                {entry.catalog?.images?.[0] ? (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.catalog.images[0]}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute right-0 bottom-0 rounded-tl bg-black/70 px-1 font-mono text-[10px] text-neutral-300">
                      {i + 1}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 font-mono text-sm text-neutral-400">
                    {i + 1}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => isActive && openEdit(entry)}
                  disabled={!isActive}
                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                >
                  <h4 className="truncate font-semibold">{entry.name}</h4>
                  <p className="text-sm text-neutral-400">
                    {[
                      entry.sets != null && entry.reps != null
                        ? `${entry.sets} × ${entry.reps}`
                        : entry.sets != null
                        ? `${entry.sets} sets`
                        : entry.reps != null
                        ? `${entry.reps} reps`
                        : null,
                      entry.weight != null ? `${entry.weight} kg` : null,
                    ]
                      .filter(Boolean)
                      .join("  ·  ") || (isActive ? "Tap to set sets/reps" : "No details")}
                  </p>
                </button>

                {/* Straight to this lift's history — useful mid-session for
                    "what did I hit last time?", and after it for the trend. */}
                <Link
                  href={`/progress?exercise=${encodeURIComponent(entry.name)}`}
                  className="touch-target tap-scale flex shrink-0 items-center justify-center rounded-xl text-neutral-500 active:text-teal-300"
                  aria-label={`Progress for ${entry.name}`}
                >
                  <LineChart className="h-5 w-5" />
                </Link>

                {isActive && (
                  <button
                    onClick={() => setPendingRemove(entry)}
                    className="touch-target tap-scale flex shrink-0 items-center justify-center rounded-xl text-neutral-500 active:text-red-400"
                    aria-label={`Remove ${entry.name}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </article>
            ))}
          </section>
        )}

        {isActive && (
          <button
            type="button"
            onClick={() => setPendingDeleteSession(true)}
            className="tap-scale mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-neutral-500 active:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            Discard session
          </button>
        )}
      </div>

      {/* Mid-workout actions live in a pinned bottom bar, in thumb reach. */}
      {isActive && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-neutral-800 bg-neutral-950/90 px-4 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl md:static md:mx-auto md:mt-6 md:max-w-3xl md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <AddExerciseDialog sessionId={session.id} onAdded={fetchSession} />
          <button
            onClick={finishSession}
            disabled={finishing || checkingChanges}
            className="tap-scale flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl border border-neutral-700 px-5 font-semibold disabled:opacity-60 md:h-12"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            {finishing
              ? "Finishing…"
              : checkingChanges
              ? "Checking…"
              : "Finish"}
          </button>
        </div>
      )}

      {!isActive && (
        <div className="mx-auto mt-6 max-w-3xl">
          <button
            type="button"
            onClick={() => setPendingDeleteSession(true)}
            className="tap-scale flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-900/60 font-semibold text-red-400 active:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
            Delete session
          </button>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={() => !savingEdit && setEditing(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full rounded-t-2xl border-t border-neutral-800 bg-neutral-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:max-w-sm sm:rounded-2xl sm:border sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">{editing.name}</h2>
            <p className="mb-4 text-xs text-neutral-400">
              {editing.exerciseId != null
                ? "Saved to this session only. At finish you can choose to make these your new default."
                : "Saved to this session."}
            </p>
            <div className="space-y-3">
              <NumberStepper
                label="Sets"
                value={editSets}
                onChange={setEditSets}
                placeholder="3"
                disabled={savingEdit}
              />
              <NumberStepper
                label="Reps"
                value={editReps}
                onChange={setEditReps}
                placeholder="10"
                disabled={savingEdit}
              />
              <NumberStepper
                label="Weight (kg)"
                value={editWeight}
                onChange={setEditWeight}
                placeholder="0"
                decimal
                step={0.5}
                disabled={savingEdit}
              />
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="tap-scale h-12 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-60"
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditing(null)}
                disabled={savingEdit}
                className="tap-scale h-12 rounded-xl border border-neutral-700 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingChanges && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={() => !finishing && setPendingChanges(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Save changes to defaults"
        >
          <div
            className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl border-t border-neutral-800 bg-neutral-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:max-w-md sm:rounded-2xl sm:border sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">Update your defaults?</h2>
            <p className="mb-4 text-sm text-neutral-400">
              You logged these differently than usual. Turn on the ones that
              should carry over to next time — leave the rest as a one-off for
              this session.
            </p>

            <div className="scroll-area -mx-1 mb-5 space-y-2 overflow-y-auto px-1">
              {pendingChanges.map((c) => {
                const on = !!saveDefaults[c.exerciseId];
                return (
                  <button
                    key={c.exerciseId}
                    type="button"
                    onClick={() =>
                      setSaveDefaults((prev) => ({
                        ...prev,
                        [c.exerciseId]: !prev[c.exerciseId],
                      }))
                    }
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      on
                        ? "border-emerald-700 bg-emerald-950/30"
                        : "border-neutral-800 bg-neutral-950"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold">{c.name}</h4>
                      <p className="mt-0.5 text-sm text-neutral-400">
                        <span className="text-neutral-300">
                          {summarize(c.logged)}
                        </span>
                        <span className="text-neutral-600">
                          {"  ·  was "}
                          {summarize(c.current)}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        on ? "bg-emerald-600" : "bg-neutral-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                          on ? "left-[1.375rem]" : "left-0.5"
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={confirmFinishWithChanges}
                disabled={finishing}
                className="tap-scale h-12 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-60"
              >
                {finishing
                  ? "Finishing…"
                  : Object.values(saveDefaults).some(Boolean)
                  ? "Save & finish"
                  : "Finish, keep all local"}
              </button>
              <button
                onClick={() => setPendingChanges(null)}
                disabled={finishing}
                className="tap-scale h-12 rounded-xl border border-neutral-700 font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={pendingRemove !== null}
        title="Remove this exercise?"
        body={
          pendingRemove
            ? `"${pendingRemove.name}" will be removed from this session.`
            : undefined
        }
        confirmLabel="Remove"
        busy={deleting}
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => pendingRemove && removeEntry(pendingRemove.id)}
      />

      <ConfirmSheet
        open={pendingDeleteSession}
        title={isActive ? "Discard this session?" : "Delete this session?"}
        body="This removes the session and everything logged in it. It can't be undone."
        confirmLabel={isActive ? "Discard" : "Delete"}
        busy={deleting}
        onCancel={() => setPendingDeleteSession(false)}
        onConfirm={deleteSession}
      />
    </div>
  );
}
