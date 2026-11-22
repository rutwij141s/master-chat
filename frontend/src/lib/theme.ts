export interface Theme {
  id: string;
  name: string;
  description: string;
  type: "light";
  colors: {
    bg: string;
    accent: string;
    highlight: string;
  };
}

export const THEMES: Theme[] = [
  {
    id: "opal-crisp",
    name: "Neo-Industrial",
    description: "Raw chalk concrete background, deep black borders, and high-voltage hyper-yellow accents.",
    type: "light",
    colors: {
      bg: "#f4f4f0",
      accent: "#FFE600",
      highlight: "#000000",
    },
  },
  {
    id: "rose-quartz",
    name: "Vermilion Signal",
    description: "Architectural off-white, uncompromising stark black gridlines, and intense signal vermilion.",
    type: "light",
    colors: {
      bg: "#fff6f3",
      accent: "#FF4D00",
      highlight: "#000000",
    },
  },
  {
    id: "azure-breeze",
    name: "Cobalt Construct",
    description: "Clean drafting paper backdrop with high-contrast structural black and electric cobalt blue.",
    type: "light",
    colors: {
      bg: "#f0f4ff",
      accent: "#0055FF",
      highlight: "#000000",
    },
  },
  {
    id: "mint-sage",
    name: "Acid Cyber",
    description: "Stark industrial grid with razor-sharp black boundaries and punchy acid-lime neon.",
    type: "light",
    colors: {
      bg: "#f2fff5",
      accent: "#00FF66",
      highlight: "#000000",
    },
  },
  {
    id: "sunset-peach",
    name: "Hot Magenta",
    description: "Raw gallery white canvas paired with bold structural outlines and vivid electric magenta.",
    type: "light",
    colors: {
      bg: "#fff0f7",
      accent: "#FF007A",
      highlight: "#000000",
    },
  },
  {
    id: "lavender-mist",
    name: "Ultraviolet",
    description: "Chalk lavender surface with brutalist monospace headers and saturated electric ultraviolet.",
    type: "light",
    colors: {
      bg: "#f7f2ff",
      accent: "#7928CA",
      highlight: "#000000",
    },
  },
  {
    id: "arctic-glacier",
    name: "Blueprint Tech",
    description: "Technical schematic light cyan with solid black geometric boxes and radiant electric cyan.",
    type: "light",
    colors: {
      bg: "#effaff",
      accent: "#00E5FF",
      highlight: "#000000",
    },
  },
  {
    id: "champagne-gold",
    name: "Solar Flare",
    description: "Warm architectural parchment, heavyweight geometric borders, and blinding solar amber.",
    type: "light",
    colors: {
      bg: "#fffdf0",
      accent: "#FFB800",
      highlight: "#000000",
    },
  },
];

const THEME_STORAGE_KEY = "masterchat_theme";

export function getStoredTheme(): string {
  if (typeof window === "undefined") return "opal-crisp";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const valid = THEMES.some((t) => t.id === stored);
  if (!stored || !valid) {
    return "opal-crisp";
  }
  return stored;
}

export function applyTheme(themeId: string): void {
  if (typeof window === "undefined") return;

  const validTheme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const root = document.documentElement;

  // Clean all previous theme classes
  THEMES.forEach((t) => {
    root.classList.remove(`theme-${t.id}`);
  });
  // Ensure dark class is purged completely
  root.classList.remove("dark");
  root.classList.add("light");

  // Apply theme modifier if not default opal-crisp
  if (validTheme.id !== "opal-crisp") {
    root.classList.add(`theme-${validTheme.id}`);
  }

  localStorage.setItem(THEME_STORAGE_KEY, validTheme.id);

  // Dispatch custom event for real-time reactive sync
  window.dispatchEvent(new CustomEvent("themechange", { detail: { themeId: validTheme.id } }));
}
