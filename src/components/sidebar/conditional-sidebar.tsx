"use client";

import { usePathname } from "next/navigation";
import React from "react";
import Navbar from "../navbar";
import Footer from "../footer";
import AppSidebar from "./app-sidebar";
import BottomNav from "../nav/bottom-nav";
import MobileTopBar from "../nav/mobile-top-bar";
import RequireAuth from "../require-auth";

/** Routes that render bare, with no app chrome at all. */
const NO_LAYOUT_ROUTES = ["/metrics"];

/** Marketing routes: marketing navbar + footer, no app navigation. */
const MARKETING_ROUTES = ["/"];

/**
 * Picks the shell for the current route.
 *
 * The app shell is mobile-first: below `md` it is a top bar plus a fixed
 * bottom tab bar, and the sidebar only appears from `md` up.
 *
 * Everything that isn't marketing sits behind RequireAuth. This is the one
 * place that already knows which routes are the signed-in app, and the guard
 * wraps the chrome as well as the page — a signed-out visitor gets a single
 * screen rather than tabs that only lead to more errors.
 */
export default function ConditionalSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (NO_LAYOUT_ROUTES.includes(pathname)) {
    return <RequireAuth>{children}</RequireAuth>;
  }

  if (MARKETING_ROUTES.includes(pathname)) {
    return (
      <>
        <Navbar />
        {children}
        <Footer />
      </>
    );
  }

  return (
    <RequireAuth>
      <div className="flex min-h-dvh">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          {/* `pb-nav` keeps content clear of the fixed tab bar on mobile. */}
          <main className="flex-1 pb-nav">{children}</main>
        </div>
        <BottomNav />
      </div>
    </RequireAuth>
  );
}
