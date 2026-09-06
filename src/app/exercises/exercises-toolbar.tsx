"use client";

import { useEffect, useRef } from "react";
import { ArrowUpDown, LayoutGrid, List, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SORT_LABELS, SORT_OPTIONS, type SortKey } from "./exercise-filters";

export interface ExercisesToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  view: "list" | "grid";
  onViewChange: (value: "list" | "grid") => void;
  facets: { value: string; count: number }[];
  selectedMuscles: string[];
  onToggleMuscle: (value: string) => void;
  filtersActive: boolean;
  onClearFilters: () => void;
  shown: number;
  total: number;
}

/**
 * Search, sort, filter and view controls for My Exercises.
 *
 * Sticky under the mobile app bar: once a list is long enough to need
 * searching, the search box is the one control that must never scroll away.
 */
export default function ExercisesToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  facets,
  selectedMuscles,
  onToggleMuscle,
  filtersActive,
  onClearFilters,
  shown,
  total,
}: ExercisesToolbarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to search on a physical keyboard, the way every list view the
  // user already knows behaves. Ignored while typing in another field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
      )
        return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-30 -mx-4 mb-2 border-b border-neutral-900 bg-neutral-950/90 px-4 py-2.5 backdrop-blur-xl md:top-0 md:-mx-8 md:px-8">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search exercises"
              aria-label="Search your exercises"
              enterKeyHint="search"
              className="h-11 rounded-xl border-neutral-800 bg-neutral-950 pr-10 pl-9 text-white placeholder:text-neutral-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  onQueryChange("");
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 active:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Sort: ${SORT_LABELS[sort]}`}
                className="touch-target tap-scale flex shrink-0 items-center justify-center gap-2 rounded-xl border border-neutral-800 px-3 text-sm font-semibold text-neutral-300"
              >
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden lg:inline">{SORT_LABELS[sort]}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => onSortChange(value as SortKey)}
              >
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Compact rows by default; the photo grid is one tap away for anyone
              who navigates their exercises by picture. */}
          <div className="flex shrink-0 rounded-xl border border-neutral-800 p-0.5">
            {(
              [
                { value: "list", label: "List view", Icon: List },
                { value: "grid", label: "Grid view", Icon: LayoutGrid },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onViewChange(value)}
                aria-label={label}
                aria-pressed={view === value}
                className={`tap-scale flex h-10 w-10 items-center justify-center rounded-lg ${
                  view === value
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500 active:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {facets.length > 1 && (
          <div className="no-scrollbar scroll-area -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 md:-mx-8 md:px-8">
            {facets.map((facet) => {
              const active = selectedMuscles.includes(facet.value);
              return (
                <button
                  key={facet.value}
                  type="button"
                  onClick={() => onToggleMuscle(facet.value)}
                  aria-pressed={active}
                  className={`tap-scale shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap capitalize ${
                    active
                      ? "border-teal-700 bg-teal-950/60 text-teal-300"
                      : "border-neutral-800 text-neutral-400"
                  }`}
                >
                  {facet.value}
                  <span className="ml-1.5 text-neutral-500 tabular-nums">
                    {facet.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Outside the sticky bar: while scrolling a long list the controls are
          what has to stay reachable, not the tally. */}
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-neutral-500">
        <p aria-live="polite" aria-atomic="true">
          {filtersActive
            ? `${shown} of ${total} ${total === 1 ? "exercise" : "exercises"}`
            : `${total} ${total === 1 ? "exercise" : "exercises"} · sorted by ${SORT_LABELS[sort].toLowerCase()}`}
        </p>
        {filtersActive && (
          <button
            type="button"
            onClick={onClearFilters}
            className="shrink-0 font-semibold text-teal-400"
          >
            Clear filters
          </button>
        )}
      </div>
    </>
  );
}
