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
    name: "Opal Crisp",
    description: "Pure white opal glass with soft ultraviolet and electric sky blue specular highlights.",
    type: "light",
    colors: {
      bg: "#f8fafc",
      accent: "#4f46e5",
      highlight: "#38bdf8",
    },
  },
  {
    id: "rose-quartz",
    name: "Rose Quartz",
    description: "Frosted champagne blush glass with delicate rose petals and soft peony glows.",
    type: "light",
    colors: {
      bg: "#fff5f7",
      accent: "#db2777",
      highlight: "#f472b6",
    },
  },
  {
    id: "azure-breeze",
    name: "Azure Breeze",
    description: "Sun-drenched Mediterranean light glass with radiant ocean cyan and cerulean blue reflections.",
    type: "light",
    colors: {
      bg: "#f0f9ff",
      accent: "#0284c7",
      highlight: "#38bdf8",
    },
  },
  {
    id: "mint-sage",
    name: "Mint Sage",
    description: "Serene morning botanical garden with frosted mint dew, fresh sage, and eucalyptus leaf glass.",
    type: "light",
    colors: {
      bg: "#f2faf5",
      accent: "#059669",
      highlight: "#34d399",
    },
  },
  {
    id: "sunset-peach",
    name: "Sunset Peach",
    description: "Warm Tuscan terrace with golden apricot, sunlit peach nectar, and terracotta specular glass.",
    type: "light",
    colors: {
      bg: "#fff7ed",
      accent: "#ea580c",
      highlight: "#f97316",
    },
  },
  {
    id: "lavender-mist",
    name: "Lavender Mist",
    description: "Gentle Provence lavender fields with delicate lilac mist, violet petals, and crystal glass.",
    type: "light",
    colors: {
      bg: "#faf5ff",
      accent: "#7c3aed",
      highlight: "#c084fc",
    },
  },
  {
    id: "arctic-glacier",
    name: "Arctic Glacier",
    description: "Glacial polar light with frosted crystalline diamond reflections and silver-blue sheen.",
    type: "light",
    colors: {
      bg: "#f1f5f9",
      accent: "#0ea5e9",
      highlight: "#94a3b8",
    },
  },
  {
    id: "champagne-gold",
    name: "Champagne Gold",
    description: "Luminous Venetian palazzo with warm champagne bubbles, spun gold silk, and ivory pearl glass.",
    type: "light",
    colors: {
      bg: "#fefce8",
      accent: "#ca8a04",
      highlight: "#eab308",
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
