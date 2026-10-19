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
        spotify: {
          green: "#1db954",
          "green-hover": "#1ed760",
          dark: "#121212",
          black: "#000000",
          elevated: "#181818",
          highlight: "#282828",
          subdued: "#a7a7a7",
        },
      },
    },
  },
  plugins: [],
};
export default config;
