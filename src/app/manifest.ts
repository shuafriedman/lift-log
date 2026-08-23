import type { MetadataRoute } from "next";

/**
 * Web app manifest so LiftLog installs to the Android home screen and opens
 * standalone (no browser chrome), which is what a gym-floor app wants.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LiftLog — Track. Train. Transform.",
    short_name: "LiftLog",
    description:
      "Track your lifts, log sessions as you train, and watch your progress build.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Start a session", url: "/sessions" },
      { name: "My exercises", url: "/exercises" },
    ],
  };
}
