import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Apex Fit",
    short_name: "Apex Fit",
    description: "Personalized routines, real progress, powered by AI.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#a6ff00",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
