import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aether — Audiophile Streaming",
    short_name: "Aether",
    description: "High-fidelity, zero-storage music player for discerning listeners",
    start_url: "/",
    display: "standalone",
    background_color: "#060709",
    theme_color: "#060709",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
