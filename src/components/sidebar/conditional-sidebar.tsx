"use client";

import { usePathname } from "next/navigation";
import React from "react";
import Navbar from "../navbar";
import Footer from "../footer";
import AppSidebar from "./app-sidebar";
import BottomNav from "../nav/bottom-nav";
import MobileTopBar from "../nav/mobile-top-bar";

/** Routes that render bare, with no app chrome at all. */
const NO_LAYOUT_ROUTES = ["/metrics"];

/** Marketing routes: marketing navbar + footer, no app navigation. */
const MARKETING_ROUTES = ["/"];

/**
 * Picks the shell for the current route.
 *
 * The app shell is mobile-first: below `md` it is a top bar plus a fixed
 * bottom tab bar, and the sidebar only appears from `md` up.
 */
export default function ConditionalSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (NO_LAYOUT_ROUTES.includes(pathname)) {
    return <>{children}</>;
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
    <div className="flex min-h-dvh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        {/* `pb-nav` keeps content clear of the fixed tab bar on mobile. */}
        <main className="flex-1 pb-nav">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
