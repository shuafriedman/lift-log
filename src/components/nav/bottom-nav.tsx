"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, NAV_ITEMS } from "./nav-items";

/**
 * Mobile primary navigation: a fixed bottom tab bar.
 *
 * This is the app's only navigation below `md` — the desktop sidebar is hidden
 * there. Every tab is a full-height 44px+ target and sits above the home
 * indicator via `pb-safe`.
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur-xl pb-safe px-safe"
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="tap-scale flex h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium"
              >
                <Icon
                  className={`h-6 w-6 transition-colors ${
                    active ? "text-emerald-400" : "text-neutral-400"
                  }`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span
                  className={
                    active
                      ? "text-emerald-400"
                      : "text-neutral-400"
                  }
                >
                  {item.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
