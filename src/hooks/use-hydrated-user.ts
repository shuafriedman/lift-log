"use client";

import { useUserStore } from "@/store/userStore";
import { useHydrated } from "./use-hydrated";

/**
 * The persisted user, but `null` until after hydration.
 *
 * `useUserStore` is backed by `persist`, which reads localStorage before React
 * hydrates. Rendering that value directly in a component that also renders on
 * the server produces a hydration mismatch (server says "U", client says "S").
 * Returning null on the first client render keeps both trees identical.
 */
export function useHydratedUser() {
  const user = useUserStore((state) => state.user);
  const hydrated = useHydrated();

  return hydrated ? user : null;
}
