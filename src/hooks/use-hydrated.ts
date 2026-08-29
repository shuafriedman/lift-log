"use client";

import { useSyncExternalStore } from "react";

/** The value never changes after mount, so there is nothing to subscribe to. */
const subscribe = () => () => {};

/**
 * False on the server and during the first client render, true afterwards.
 *
 * The usual `useState(false)` + `useEffect(() => setMounted(true))` does the
 * same job, but setting state straight from an effect schedules a second render
 * pass for every consumer. `useSyncExternalStore` gets the same answer from its
 * server and client snapshots, with no cascading render.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
