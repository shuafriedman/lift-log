"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useUserStore } from "@/store/userStore";
import HandleLogin from "@/components/handle-login";
import LogoLoading from "@/app/logo-loading/page";

/**
 * The gate in front of the signed-in app.
 *
 * An expired cookie used to be invisible. The installed app opens at
 * /dashboard rather than at the landing page, the name in the navbar came from
 * localStorage so the UI still looked signed in, and nothing checked the
 * session — so every screen just fetched, got a 401, and rendered its own
 * generic error. Asking once, here, turns that into one honest screen with a
 * way out of it.
 */
export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = authClient.useSession();
  const clearUser = useUserStore((state) => state.clearUser);
  const pathname = usePathname();

  const signedOut = !isPending && !session?.user;

  useEffect(() => {
    // The persisted store outlives the cookie, so drop it as soon as the
    // session is gone. Otherwise the chrome keeps claiming you're signed in.
    if (signedOut) clearUser();
  }, [signedOut, clearUser]);

  if (isPending) return <LogoLoading />;

  if (signedOut) {
    return (
      <section className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <LogIn className="h-7 w-7 text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-white">You&apos;re signed out</h1>
          <p className="mx-auto max-w-xs text-sm text-neutral-400">
            Your session expired. Sign in again to pick up where you left off —
            nothing you logged has been lost.
          </p>
        </div>
        {/* Come back to the screen they were actually trying to reach. */}
        <HandleLogin label="Sign in with Google" callbackURL={pathname} />
      </section>
    );
  }

  return <>{children}</>;
}
