// /src/app/LandingPage.tsx (or /src/app/page.tsx, depending on your setup)
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HandleLogin from "@/components/handle-login";
import { authClient } from "@/lib/auth-client";
import Hero from "@/components/landing-page/hero";
import LogoLoading from "./logo-loading/page";
import Features from "@/components/landing-page/features";
import Pricing from "@/components/landing-page/pricing";
import CTASection from "@/components/landing-page/cta-section";

// Define the expected structure of the user data from /api/profile
interface UserProfile {
  height: number | null;
  weight: number | null;
  // You might need other fields here depending on your profile API
}

export default function LandingPage() {
  // Hooks must be unconditional and at the top
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    // Only proceed if the user is authenticated
    if (!session?.user) return;

    const redirectUser = async () => {
      try {
        // Fetch the user's profile data from your API route
        const res = await fetch("/api/profile", { credentials: "include" });

        if (!res.ok) {
          // If the status is 404 (User not found) or another error
          throw new Error("Failed to fetch user data");
        }

        // Parse the JSON body to get the profile metrics
        const userData: UserProfile = await res.json();

        // Conditional Redirection Logic:
        // If both height and weight are present, redirect to the dashboard.
        if (userData.height && userData.weight) {
          router.replace("/dashboard");
        } else {
          // If either height or weight is missing, redirect to the metrics setup page.
          router.replace("/metrics");
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        // Set an error state if fetching fails after the user is authenticated
        if (session?.user) setError("Something went wrong. Please try again.");
      }
    };

    void redirectUser();
  }, [session, isPending, router]);

  // Motion values created unconditionally
  const { scrollY } = useScroll();
  const blobY = useTransform(scrollY, [0, 400], [0, 40]);
  const blobRotate = useTransform(scrollY, [0, 400], [0, 8]);

  const showLoading = isPending;
  const showError = !isPending && error;

  return (
    <div className="flex flex-col min-h-dvh bg-[radial-gradient(1200px_800px_at_50%_-10%,#0f172a,transparent),linear-gradient(to_b,#0b1220,#030712_70%)] text-white">
      {/* Loading */}
      {showLoading && <LogoLoading />}

      {/* Error */}
      {!showLoading && showError && (
        <section className="flex min-h-dvh flex-col items-center justify-center px-5">
          <p className="text-red-500 mb-4">{error}</p>
          <HandleLogin />
        </section>
      )}

      {/* Main content */}
      {!showLoading && !showError && (
        <>
          {/* Subtle parallax blobs */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed -z-10 inset-0"
            style={{ y: blobY, rotate: blobRotate }}
          >
            <div className="absolute left-1/2 top-24 -translate-x-1/2 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute right-20 top-64 h-56 w-56 rounded-full bg-teal-400/10 blur-2xl" />
          </motion.div>

          <Hero />
          <Features />
          <CTASection />
          <Pricing />
        </>
      )}
    </div>
  );
}