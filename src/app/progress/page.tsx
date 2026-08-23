"use client";

import { useState, useEffect } from "react";
import ProgressDialog from "./progress-dialog";
import { handleError } from "@/components/error-handle";
import { MdDelete } from "react-icons/md";
import { BiDumbbell } from "react-icons/bi";
import { AiOutlineCheckCircle } from "react-icons/ai";
import LogoLoading from "../logo-loading/page";
import LiftLogMark from "@/components/lift-log-mark";
import ConfirmSheet from "@/components/confirm-sheet";

export interface DailySummary {
  id: string;
  date: string;
  caloriesBurned: number;
  weight: number | null;
}

export default function Progress() {
  const [progress, setProgress] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch progress data
  const fetchProgress = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/progress");
      const data = await res.json();

      if (!data.success) throw new Error("Failed to fetch progress");

      setProgress(Array.isArray(data.progress) ? data.progress : []);
    } catch (err) {
      const errMsg = handleError(err);
      setError(typeof errMsg === "string" ? errMsg : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Delete item after confirmation
  const confirmDelete = async () => {
    if (!selectedId) return;

    try {
      setDeleteId(selectedId);

      const res = await fetch(`/api/progress`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId }),
      });

      if (!res.ok) throw new Error("Failed to delete entry");

      await fetchProgress();
    } catch (err) {
      const errMsg = handleError(err);
      setError(typeof errMsg === "string" ? errMsg : "An error occurred.");
    } finally {
      setDeleteId(null);
      setShowDeleteModal(false);
      setSelectedId(null);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  if (loading) return <LogoLoading />;

  return (
    <div className="px-4 py-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-5 flex items-center gap-3">
          <LiftLogMark className="h-10 w-10 shrink-0 md:h-14 md:w-14" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold md:text-3xl">
              My Progress
            </h1>
            <p className="text-sm text-neutral-400">
              {progress.length} {progress.length === 1 ? "entry" : "entries"}{" "}
              tracked
            </p>
          </div>
        </header>

        <div className="mb-6">
          <ProgressDialog onsuccess={fetchProgress} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border-2 border-red-800 p-4 dark:bg-neutral-950">
            <BiDumbbell className="shrink-0 text-xl text-red-500" />
            <p className="font-medium text-red-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {progress.length === 0 && !error && (
          <div className="rounded-2xl border border-neutral-800 px-6 py-10 text-center dark:bg-neutral-950">
            <BiDumbbell className="mx-auto mb-4 text-5xl text-gray-400" />
            <h3 className="mb-2 text-xl font-bold">No Progress Yet</h3>
            <p className="mx-auto mb-5 max-w-md text-sm text-neutral-400">
              Track your fitness journey by adding your first progress entry!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <AiOutlineCheckCircle className="text-lg" />
              <span className="font-medium">
                Tap &quot;Add Workout Session&quot; to begin
              </span>
            </div>
          </div>
        )}

        {/* Entries. A dense row per day reads better on a phone than a card
            with a 24px icon block and two stacked stat boxes. */}
        {progress.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {progress.map((entry, index) => (
              <article
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl border border-teal-950 p-4 shadow-lg backdrop-blur-xl"
                style={{
                  animation: `fadeIn 0.4s ease-out ${Math.min(index, 6) * 0.06}s both`,
                }}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold">
                    {new Date(entry.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p className="text-sm text-neutral-400">
                      <span className="text-xl font-bold text-lift-gradient">
                        {entry.caloriesBurned}
                      </span>{" "}
                      kcal
                    </p>
                    {entry.weight !== null && (
                      <p className="text-sm text-neutral-400">
                        <span className="text-xl font-bold text-lift-gradient">
                          {entry.weight}
                        </span>{" "}
                        kg
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedId(entry.id);
                    setShowDeleteModal(true);
                  }}
                  disabled={deleteId === entry.id}
                  className="touch-target tap-scale flex shrink-0 items-center justify-center rounded-xl text-neutral-500 active:text-red-400 disabled:opacity-50"
                  aria-label="Delete entry"
                >
                  <MdDelete className="text-xl" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      <ConfirmSheet
        open={showDeleteModal}
        title="Delete this entry?"
        body="This action cannot be undone."
        busy={deleteId !== null}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedId(null);
        }}
        onConfirm={confirmDelete}
      />

      {/* Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInDown {
          animation: fadeInDown 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
