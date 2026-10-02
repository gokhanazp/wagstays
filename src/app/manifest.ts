import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WagStays — Trusted Pet Sitters",
    short_name: "WagStays",
    description: "Verified pet sitters and dog walkers near you.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f4",
    theme_color: "#226150",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
