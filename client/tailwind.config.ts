import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: "var(--color-primary)",
        "primary-foreground": "var(--color-primary-foreground)",
        secondary: "var(--color-secondary)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        begena: {
          gold: "#D4AF37",
          brown: "#8B4513",
          cream: "#F5E6D3",
          darkBrown: "#5D4037",
          lightBrown: "#A0826D",
          orthodoxRed: "#DA291C",
          orthodoxGreen: "#078930",
          orthodoxYellow: "#FCDD09",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "Merriweather", "ui-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

