"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { FiSearch } from "react-icons/fi";
import { BiDumbbell } from "react-icons/bi";
import { Circle } from "lucide-react";

export interface CatalogItem {
  id: string;
  name: string;
  category: string | null;
  equipment: string | null;
  level: string | null;
  force: string | null;
  mechanic: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
}

interface ExercisePickerProps {
  onSelect: (item: CatalogItem) => void;
  selectedId?: string | null;
}

export default function ExercisePicker({
  onSelect,
  selectedId,
}: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (q: string, pageToLoad: number, append: boolean) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        q,
        page: String(pageToLoad),
        limit: "24",
      });
      const res = await fetch(`/api/catalog?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`);
      const data = await res.json();
      setItems((prev) =>
        append ? [...prev, ...(data.items ?? [])] : data.items ?? []
      );
      setHasMore(Boolean(data.hasMore));
      setTotal(data.total ?? 0);
      setPage(pageToLoad);
    } catch {
      if (!append) setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search whenever the query changes.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(query.trim(), 1, false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <Input
          placeholder="Search 800+ exercises… (e.g. bench press, squat)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-2 border-neutral-800 focus:border-neutral-200 focus:ring-4 focus:ring-neutral-900 rounded-xl text-white placeholder:text-neutral-500 bg-neutral-950 h-12 text-base pl-11"
        />
      </div>

      <div className="text-xs text-neutral-500 px-1">
        {loading && items.length === 0
          ? "Searching…"
          : `${total} exercise${total === 1 ? "" : "s"} found`}
      </div>

      {/* The list is its own scroll area, so anything below it in a dialog is
          unreachable on a phone if the list eats the whole screen — cap it at
          a share of the viewport, not a fixed 26rem. */}
      <div className="max-h-[min(26rem,38dvh)] overflow-y-auto space-y-2 pr-1">
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-teal-500 bg-teal-950/40"
                  : "border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900"
              }`}
            >
              <div className="h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800 flex items-center justify-center">
                {item.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.images[0]}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <BiDumbbell className="text-neutral-500 text-2xl" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold truncate">{item.name}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.primaryMuscles?.slice(0, 2).map((m) => (
                    <span
                      key={m}
                      className="text-[10px] uppercase tracking-wide text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded-full"
                    >
                      {m}
                    </span>
                  ))}
                  {item.equipment && (
                    <span className="text-[10px] uppercase tracking-wide text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                      {item.equipment}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {!loading && items.length === 0 && (
          <div className="text-center text-neutral-500 py-8 text-sm">
            No matching exercises. Try a different search.
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={() => load(query.trim(), page + 1, true)}
            disabled={loading}
            className="w-full py-2 text-sm text-neutral-300 border border-neutral-800 rounded-xl hover:bg-neutral-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
