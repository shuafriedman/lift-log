"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

export default function HandleLogin({
  label = "Dominate Today",
  /** Where to land after Google sends the user back. */
  callbackURL = "/dashboard",
}: {
  label?: string;
  callbackURL?: string;
}) {
  const handlelogin = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch (error: unknown) {
      console.error(error);
    }
  };

  return (
    <Button onClick={handlelogin} size="lg" className="w-full sm:w-auto">
      {label}
    </Button>
  );
}
