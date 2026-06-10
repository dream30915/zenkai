import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Japanese restaurant brand colors
        sakura: {
          50: "#fdf2f4",
          100: "#fce7eb",
          200: "#f9d0da",
          300: "#f4a9bc",
          400: "#ec7595",
          500: "#e04873",
          600: "#cc2858",
          700: "#ac1d48",
          800: "#901b42",
          900: "#7b1b3e",
        },
        nori: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          700: "#15803d",
          900: "#14532d",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
