import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aether: {
          black: "#060709",
          dark: "#0C0D12",
          surface: "#12141C",
          elevated: "#181A24",
          highlight: "#222533",
          border: "#262938",
          "border-subtle": "#1B1D28",
          gold: "#E6C280",
          "gold-hover": "#F5D698",
          "gold-muted": "#9A8152",
          "gold-glow": "rgba(230, 194, 128, 0.15)",
          text: "#F3F3F6",
          subdued: "#8B8E9D",
          muted: "#525462",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        "gold-glow": "0 0 35px -5px rgba(230, 194, 128, 0.25)",
        "island": "0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(230, 194, 128, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
