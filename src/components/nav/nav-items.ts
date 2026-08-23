import { BarChart3, Dumbbell, Home, List, Timer } from "lucide-react";

/**
 * The app's primary destinations, shared by the mobile tab bar and the desktop
 * sidebar so the two can never drift apart.
 *
 * Order matters on mobile: these become the bottom tab bar left-to-right, and
 * the most-used destination (starting a session) sits in the middle where the
 * thumb naturally rests.
 */
export const NAV_ITEMS = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Workouts", href: "/workouts", icon: Dumbbell },
  { name: "Sessions", href: "/sessions", icon: Timer },
  { name: "Exercises", href: "/exercises", icon: List },
  { name: "Progress", href: "/progress", icon: BarChart3 },
] as const;

/** Title shown in the mobile top bar for a given pathname. */
export function titleForPath(pathname: string): string {
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/sessions/")) return "Session";
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.href));
  return match?.name ?? "LiftLog";
}

/** True when `href` is the section the user is currently in. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
