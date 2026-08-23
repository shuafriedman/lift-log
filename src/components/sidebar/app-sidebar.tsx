"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydratedUser } from "@/hooks/use-hydrated-user";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import LiftLogMark from "../lift-log-mark";
import { isActivePath, NAV_ITEMS } from "../nav/nav-items";

/**
 * Desktop navigation. Hidden below `md`, where `BottomNav` takes over.
 *
 * This used to be a shadcn `Sidebar`, which collapses into a `Sheet` on mobile
 * — but nothing in the app ever rendered a `SidebarTrigger`, so on a phone the
 * sheet had no way to open and the app had no navigation at all. A plain
 * `<aside>` that simply doesn't exist on mobile is both simpler and honest
 * about where each layout applies.
 */
export default function AppSidebar() {
  const user = useHydratedUser();
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:shrink-0 border-r border-white/10 bg-neutral-900 text-white">
      <div className="flex items-center gap-2 p-4">
        <LiftLogMark className="h-12 w-12" />
        <span className="text-xl font-bold tracking-wide">LiftLog</span>
      </div>

      <nav aria-label="Primary" className="flex flex-col gap-1 px-2 mt-2">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md font-semibold transition-colors hover:bg-white/5"
            >
              <Icon
                size={20}
                className={active ? "text-emerald-400" : "text-white"}
              />
              <span className={active ? "text-lift-gradient" : "text-white"}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/profile"
        className="mt-auto m-2 flex items-center gap-3 px-3 py-2 rounded-md font-semibold transition-colors hover:bg-white/5"
      >
        <Avatar>
          <AvatarImage src={user?.image} alt="" />
          <AvatarFallback>
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{user?.name ?? "User"}</span>
      </Link>
    </aside>
  );
}
