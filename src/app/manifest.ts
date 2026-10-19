import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spotify - Web Player",
    short_name: "Spotify",
    description: "Personal zero-storage music streaming player",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#1db954",
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
