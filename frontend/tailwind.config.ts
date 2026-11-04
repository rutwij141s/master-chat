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
        background: "var(--background)",
        foreground: "var(--foreground)",
        glass: {
          light: "rgba(255, 255, 255, 0.45)",
          lightHover: "rgba(255, 255, 255, 0.60)",
          lightBorder: "rgba(255, 255, 255, 0.35)",
          dark: "rgba(18, 18, 26, 0.45)",
          darkHover: "rgba(28, 28, 40, 0.60)",
          darkBorder: "rgba(255, 255, 255, 0.12)",
        },
      },
      borderRadius: {
        glass: "24px",
        "glass-sm": "16px",
        "glass-lg": "32px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.12), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)",
        "glass-lg": "0 16px 48px 0 rgba(0, 0, 0, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)",
        "glass-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)",
        "glass-dark-lg": "0 16px 48px 0 rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)",
      },
      backdropBlur: {
        glass: "32px",
        "glass-sm": "20px",
        "glass-lg": "48px",
      },
      backdropSaturate: {
        180: "180%",
      },
    },
  },
  plugins: [],
};

export default config;
