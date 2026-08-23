"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { handleError } from "@/components/error-handle";
import LogoLoading from "../../logo-loading/page";
import AddExerciseDialog from "./add-exercise-dialog";
import { ArrowLeft, CheckCircle2, Trash2, Dumbbell } from "lucide-react";

interface SessionEntry {
  id: number;
  name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  catalog?: { images: string[] } | null;
}

interface WorkoutSession {
  id: number;
  name: string | null;
  startedAt: string;
  endedAt: string | null;
  entries: SessionEntry[];
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
  const secs = Math.max(0, Math.floor((end - new Date(startISO).getTime()) / 1000));
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
  const [nameDraft, setNameDraft] = useState("");

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
      try {
        const res = await fetch(
          `/api/session/${id}/exercise?entryId=${entryId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to remove exercise");
        fetchSession();
      } catch (error) {
        handleError(error);
      }
    },
    [id, fetchSession]
  );

  const finishSession = useCallback(async () => {
    setFinishing(true);
    try {
      const res = await fetch(`/api/session/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish" }),
      });
      if (!res.ok) throw new Error("Failed to finish session");
      router.push("/sessions");
    } catch (error) {
      handleError(error);
      setFinishing(false);
    }
  }, [id, router]);

  if (status === "loading") return <LogoLoading />;

  if (status === "error" || !session) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-400">Session not found.</p>
        <Button onClick={() => router.push("/sessions")}>Back to Sessions</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push("/sessions")}
          className="flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All sessions
        </button>

        {/* Header */}
        <header className="rounded-2xl shadow-lift-gradient border border-neutral-800 p-6 md:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              {isActive ? (
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveName}
                  placeholder="Name this session (optional)"
                  className="bg-transparent text-3xl font-bold outline-none border-b border-transparent focus:border-neutral-700 w-full placeholder:text-neutral-600"
                />
              ) : (
                <h1 className="text-3xl font-bold">
                  {session.name ||
                    new Date(session.startedAt).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                </h1>
              )}
              <p className="text-neutral-400 mt-2">
                {new Date(session.startedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="text-right">
              <div
                className={`text-4xl font-mono font-bold tabular-nums ${
                  isActive ? "text-emerald-400" : "text-neutral-300"
                }`}
              >
                {elapsed}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {isActive ? "● in progress" : "completed"}
              </p>
            </div>
          </div>
        </header>

        {/* Actions */}
        {isActive && (
          <div className="flex items-center justify-between mb-6">
            <AddExerciseDialog
              sessionId={session.id}
              onAdded={fetchSession}
            />
            <Button
              onClick={finishSession}
              disabled={finishing}
              className="flex items-center gap-2 font-semibold px-5 py-3 rounded-xl h-12 border border-neutral-700 hover:bg-neutral-900"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              {finishing ? "Finishing..." : "Finish"}
            </Button>
          </div>
        )}

        {/* Logged exercises */}
        {session.entries.length === 0 ? (
          <section className="bg-neutral-950 rounded-2xl border border-neutral-800 p-12 text-center">
            <Dumbbell className="w-10 h-10 mx-auto mb-4 text-neutral-500" />
            <h3 className="text-xl font-bold mb-2">No exercises logged yet</h3>
            <p className="text-neutral-400">
              {isActive
                ? "Add your first exercise to start logging this session."
                : "This session had no logged exercises."}
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {session.entries.map((entry, i) => (
              <article
                key={entry.id}
                className="group flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 hover:border-neutral-700 transition-colors"
              >
                {entry.catalog?.images?.[0] ? (
                  <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.catalog.images[0]}
                      alt={entry.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-0 right-0 px-1 text-[10px] font-mono text-neutral-300 bg-black/70 rounded-tl">
                      {i + 1}
                    </span>
                  </div>
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-neutral-400 font-mono">
                    {i + 1}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{entry.name}</h4>
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
                      .join("  ·  ") || "No details"}
                  </p>
                </div>
                {isActive && (
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-red-400 p-2"
                    aria-label="Remove exercise"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
