"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { handleError } from "@/components/error-handle";
import LogoLoading from "../logo-loading/page";
import { Play, Dumbbell, Trash2, ChevronRight } from "lucide-react";
import ConfirmSheet from "@/components/confirm-sheet";

interface SessionEntry {
  id: number;
  name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
}

interface WorkoutSession {
  id: number;
  name: string | null;
  startedAt: string;
  endedAt: string | null;
  entries: SessionEntry[];
}

function formatDuration(startISO: string, endISO: string | null) {
  if (!endISO) return "In progress";
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "success">(
    "loading"
  );
  const [starting, setStarting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
      setStatus("success");
    } catch (error) {
      handleError(error);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const activeSession = sessions.find((s) => s.endedAt === null);

  const startSession = useCallback(async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to start session");
      const data = await res.json();
      router.push(`/sessions/${data.session.id}`);
    } catch (error) {
      handleError(error);
      setStarting(false);
    }
  }, [router]);

  const deleteSession = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/session/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      handleError(error);
    } finally {
      setConfirmDelete(null);
    }
  }, []);

  if (status === "loading") return <LogoLoading />;

  return (
    <div className="px-4 py-5 md:p-8">
      {/* Extra bottom room on mobile for the pinned start-session bar. */}
      <div className="mx-auto max-w-5xl pb-24 md:pb-0">
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Sessions
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Start a workout and log exercises on the fly
          </p>
        </header>

        {/* Primary action. On mobile this is pinned above the tab bar so it is
            reachable no matter how far down the history you have scrolled. */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800 bg-neutral-950/90 px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl md:static md:mb-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          {activeSession ? (
            <button
              onClick={() => router.push(`/sessions/${activeSession.id}`)}
              className="tap-scale flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-semibold text-white active:bg-emerald-700 md:h-12 md:w-auto md:px-6"
            >
              <Play className="h-5 w-5" /> Resume session
            </button>
          ) : (
            <button
              onClick={startSession}
              disabled={starting}
              className="tap-scale flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-semibold text-white disabled:opacity-60 active:bg-emerald-700 md:h-12 md:w-auto md:px-6"
            >
              <Play className="h-5 w-5" />
              {starting ? "Starting…" : "Start session"}
            </button>
          )}
        </div>

        {status === "error" && (
          <p className="mb-6 text-center text-red-400">
            Something went wrong.{" "}
            <button className="underline" onClick={fetchSessions}>
              Retry
            </button>
          </p>
        )}

        {sessions.length === 0 && status === "success" && (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950 px-6 py-10 text-center">
            <Dumbbell className="mx-auto mb-4 h-10 w-10 text-neutral-500" />
            <h3 className="mb-2 text-xl font-bold">No sessions yet</h3>
            <p className="mx-auto max-w-md text-sm text-neutral-400">
              Hit{" "}
              <span className="font-semibold text-emerald-400">
                Start session
              </span>{" "}
              and add exercises as you work out. Each one is logged for your
              progress.
            </p>
          </section>
        )}

        {sessions.length > 0 && (
          <section className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {sessions.map((s) => {
              const isActive = s.endedAt === null;
              return (
                <article
                  key={s.id}
                  className={`group rounded-2xl border transition-colors ${
                    isActive
                      ? "border-emerald-600/60 bg-emerald-950/20"
                      : "border-neutral-800 bg-neutral-950"
                  }`}
                >
                  <div className="flex items-stretch">
                    {/* The whole row is the tap target — no hover required. */}
                    <button
                      onClick={() => router.push(`/sessions/${s.id}`)}
                      className="tap-scale min-w-0 flex-1 p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="truncate text-base font-semibold md:text-lg">
                          {s.name ||
                            new Date(s.startedAt).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                        </h3>
                        {isActive ? (
                          <span className="shrink-0 rounded-full border border-emerald-700/50 bg-emerald-600/20 px-2.5 py-1 text-[11px] whitespace-nowrap text-emerald-300">
                            ● Active
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-neutral-700 px-2.5 py-1 text-[11px] whitespace-nowrap text-neutral-300">
                            {formatDuration(s.startedAt, s.endedAt)}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-neutral-400">
                        {new Date(s.startedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      <p className="mt-2 line-clamp-2 text-sm text-neutral-400">
                        {s.entries.length}{" "}
                        {s.entries.length === 1 ? "exercise" : "exercises"}
                        {s.entries.length > 0 && (
                          <span className="text-neutral-500">
                            {" · "}
                            {s.entries
                              .slice(0, 3)
                              .map((e) => e.name)
                              .join(", ")}
                            {s.entries.length > 3 ? "…" : ""}
                          </span>
                        )}
                      </p>
                    </button>

                    <div className="flex shrink-0 flex-col items-center justify-center gap-1 pr-2">
                      {!isActive && (
                        <button
                          onClick={() => setConfirmDelete(s.id)}
                          className="touch-target tap-scale flex items-center justify-center rounded-xl text-neutral-500 active:text-red-400"
                          aria-label={`Delete session ${s.name ?? ""}`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                      <ChevronRight className="h-5 w-5 shrink-0 text-neutral-600" />
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      <ConfirmSheet
        open={confirmDelete !== null}
        title="Delete this session?"
        body="This removes the session and everything logged in it. It can't be undone."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete !== null && deleteSession(confirmDelete)}
      />
    </div>
  );
}
