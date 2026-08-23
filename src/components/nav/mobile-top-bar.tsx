"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import LiftLogMark from "../lift-log-mark";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useHydratedUser } from "@/hooks/use-hydrated-user";
import { titleForPath } from "./nav-items";

/**
 * Mobile app bar: identity on the left, profile on the right.
 *
 * Detail routes (`/sessions/123`) get a back chevron instead of the logo, so
 * the user is never stranded on a screen the tab bar can't return from.
 */
export default function MobileTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useHydratedUser();

  const isDetail = /^\/sessions\/[^/]+$/.test(pathname);
  const title = titleForPath(pathname);

  return (
    <header className="md:hidden sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/85 backdrop-blur-xl pt-safe px-safe">
      <div className="flex h-14 items-center gap-2 px-2">
        {isDetail ? (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="touch-target tap-scale flex items-center justify-center rounded-full text-neutral-300"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : (
          <span className="flex h-11 w-11 items-center justify-center">
            <LiftLogMark className="h-8 w-8" />
          </span>
        )}

        <h1 className="flex-1 truncate text-lg font-bold tracking-tight">
          {title}
        </h1>

        <Link
          href="/profile"
          aria-label="Profile"
          className="touch-target tap-scale flex items-center justify-center rounded-full"
        >
          <Avatar className="h-9 w-9 border border-neutral-700">
            <AvatarImage src={user?.image} alt="" />
            <AvatarFallback className="bg-neutral-800 text-sm">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
