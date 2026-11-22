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
      fontFamily: {
        sans: [
          "var(--font-montserrat-alternates)",
          "'Montserrat Alternates'",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "'Liberation Mono'",
          "'Courier New'",
          "monospace",
        ],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brutal: {
          bg: "var(--brutal-bg)",
          surface: "var(--brutal-surface)",
          accent: "var(--brutal-accent)",
          accentHover: "var(--brutal-accent-hover)",
          border: "#000000",
          yellow: "#FFE600",
          green: "#00FF66",
          blue: "#0055FF",
          orange: "#FF4D00",
          purple: "#7928CA",
          pink: "#FF007A",
          cyan: "#00F0FF",
          amber: "#FFB800",
          dark: "#0F0F0F",
          muted: "#E5E5E0",
        },
      },
      borderWidth: {
        DEFAULT: "1px",
        "2": "2px",
        "3": "3px",
        "4": "4px",
        "5": "5px",
        "6": "6px",
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px #000000",
        "brutal-sm": "2px 2px 0px 0px #000000",
        "brutal-md": "6px 6px 0px 0px #000000",
        "brutal-lg": "8px 8px 0px 0px #000000",
        "brutal-xl": "12px 12px 0px 0px #000000",
        "brutal-hover": "6px 6px 0px 0px #000000",
        "brutal-active": "1px 1px 0px 0px #000000",
        "brutal-reverse": "-4px -4px 0px 0px #000000",
      },
      borderRadius: {
        none: "0px",
      },
    },
  },
  plugins: [],
};

export default config;
