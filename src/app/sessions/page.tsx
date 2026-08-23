"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { handleError } from "@/components/error-handle";
import LogoLoading from "../logo-loading/page";
import { Play, Timer, Dumbbell, Trash2 } from "lucide-react";

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

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data.sessions ?? []);
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

  const deleteSession = useCallback(
    async (id: number) => {
      try {
        const res = await fetch(`/api/session/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete session");
        setSessions((prev) => prev.filter((s) => s.id !== id));
      } catch (error) {
        handleError(error);
      }
    },
    []
  );

  if (status === "loading") return <LogoLoading />;

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="rounded-2xl shadow-lift-gradient p-6 md:p-8 mb-8 border border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-neutral-800 p-4 rounded-2xl border border-neutral-900">
              <Timer className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Sessions</h1>
              <p className="text-neutral-400 mt-1">
                Start a workout and log exercises on the fly
              </p>
            </div>
          </div>

          {activeSession ? (
            <Button
              onClick={() => router.push(`/sessions/${activeSession.id}`)}
              className="flex items-center gap-2 font-semibold px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white h-12"
            >
              <Play className="w-5 h-5" /> Resume Session
            </Button>
          ) : (
            <Button
              onClick={startSession}
              disabled={starting}
              className="flex items-center gap-2 font-semibold px-6 py-3 rounded-xl h-12 hover:scale-105 transition-transform"
            >
              <Play className="w-5 h-5" />
              {starting ? "Starting..." : "Start Session"}
            </Button>
          )}
        </header>

        {status === "error" && (
          <p className="text-red-400 text-center mb-8">
            Something went wrong.{" "}
            <button className="underline" onClick={fetchSessions}>
              Retry
            </button>
          </p>
        )}

        {/* Empty state */}
        {sessions.length === 0 && status === "success" && (
          <section className="bg-neutral-950 rounded-2xl shadow-xl p-12 text-center border border-neutral-800">
            <Dumbbell className="w-10 h-10 mx-auto mb-4 text-neutral-500" />
            <h3 className="text-2xl font-bold mb-3">No sessions yet</h3>
            <p className="mb-6 max-w-md mx-auto text-neutral-400">
              Hit <span className="text-emerald-400 font-semibold">Start
              Session</span> and add exercises as you work out. Each one is
              logged for your progress.
            </p>
          </section>
        )}

        {/* History */}
        {sessions.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sessions.map((s) => {
              const isActive = s.endedAt === null;
              return (
                <article
                  key={s.id}
                  className={`group rounded-2xl border p-6 transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "border-emerald-600/60 bg-emerald-950/20"
                      : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                  }`}
                  onClick={() => router.push(`/sessions/${s.id}`)}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {s.name ||
                          new Date(s.startedAt).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                      </h3>
                      <p className="text-sm text-neutral-400 mt-1">
                        {new Date(s.startedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {isActive ? (
                      <span className="text-xs px-3 py-1 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-700/50 whitespace-nowrap">
                        ● Active
                      </span>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded-full border border-neutral-700 text-neutral-300 whitespace-nowrap">
                        {formatDuration(s.startedAt, s.endedAt)}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-neutral-400">
                      {s.entries.length}{" "}
                      {s.entries.length === 1 ? "exercise" : "exercises"}
                      {s.entries.length > 0 && (
                        <span className="text-neutral-500">
                          {" "}
                          ·{" "}
                          {s.entries
                            .slice(0, 3)
                            .map((e) => e.name)
                            .join(", ")}
                          {s.entries.length > 3 ? "…" : ""}
                        </span>
                      )}
                    </p>
                    {!isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(s.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-red-400 p-1"
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
