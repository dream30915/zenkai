import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: ["class"],
  content: ["./pages/**/*.{js,ts,jsx,tsx,mdx}","./components/**/*.{js,ts,jsx,tsx,mdx}","./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))", input: "hsl(var(--input))", ring: "hsl(var(--ring))",
        background: "hsl(var(--background))", foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        // Legacy (used in existing components)
        sakura: { 50:"#fdf2f4",100:"#fce7eb",200:"#f9d0da",300:"#f4a9bc",400:"#ec7595",500:"#e04873",600:"#cc2858",700:"#ac1d48",800:"#901b42",900:"#7b1b3e" },
        // Japanese palette
        sumi:    { 950:"#0D0F17", 900:"#131720", 800:"#1C2235", 700:"#252B3E", 600:"#2E3650", 500:"#404B69", 400:"#6070A0", 300:"#8899CC", 200:"#C0CBE8", 100:"#E8ECF5", 50:"#F5F6FB" },
        beni:    { 700:"#991B1B", 600:"#B91C1C", 500:"#DC2626", 400:"#EF4444", 300:"#FCA5A5", 100:"#FEE2E2", 50:"#FFF5F5" },
        kin:     { 700:"#92610A", 600:"#A97C0D", 500:"#C9A84C", 400:"#D4B46A", 300:"#E2CB96", 100:"#F7EED5", 50:"#FDFAF0" },
        washi:   { 50:"#FDFCF8", 100:"#F7F3EC", 200:"#EDE8DE", 300:"#DDD5C6" },
        seiji:   { 600:"#3D9B7A", 500:"#4DB893", 400:"#70CBA9", 100:"#DFFBF3" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "shimmer": { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.4s ease-out both",
        "shimmer": "shimmer 1.5s infinite linear",
      },
    },
  },
  plugins: [],
};
export default config;
