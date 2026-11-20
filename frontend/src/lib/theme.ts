export interface Theme {
  id: string;
  name: string;
  description: string;
  type: "dark" | "light";
  colors: {
    bg: string;
    accent: string;
    highlight: string;
  };
}

export const THEMES: Theme[] = [
  {
    id: "light",
    name: "Opal Crisp",
    description: "Luminous white opal glass with soft ultraviolet and sky blue highlights.",
    type: "light",
    colors: {
      bg: "#f4f6fa",
      accent: "#4f46e5",
      highlight: "#38bdf8",
    },
  },
  {
    id: "cyber-aurora",
    name: "Cyber Aurora",
    description: "Bioluminescent cyan & emerald aurora reflections over cosmic deep navy.",
    type: "dark",
    colors: {
      bg: "#05131a",
      accent: "#14b8a6",
      highlight: "#06b6d4",
    },
  },
  {
    id: "midnight-amethyst",
    name: "Velvet Amethyst",
    description: "Royal imperial purple & fuchsia reflections over obsidian darkness.",
    type: "dark",
    colors: {
      bg: "#0d0819",
      accent: "#a855f7",
      highlight: "#d946ef",
    },
  },
  {
    id: "solar-amber",
    name: "Solar Amber",
    description: "Warm sunset bronze, golden topaz, and saffron specular glass accents.",
    type: "dark",
    colors: {
      bg: "#140d07",
      accent: "#f59e0b",
      highlight: "#ea580c",
    },
  },
  {
    id: "emerald-matrix",
    name: "Bioluminescent Jade",
    description: "Cybernetic jade, radiant mint, and forest obsidian glass reflections.",
    type: "dark",
    colors: {
      bg: "#05140d",
      accent: "#10b981",
      highlight: "#34d399",
    },
  },
  {
    id: "neon-synthwave",
    name: "Neon Synthwave",
    description: "Electrifying 80s vaporwave hot pink, magenta, and cyan cyberpunk aura.",
    type: "dark",
    colors: {
      bg: "#0c0a1a",
      accent: "#f43f5e",
      highlight: "#06b6d4",
    },
  },
  {
    id: "oceanic-abyss",
    name: "Oceanic Abyss",
    description: "Deep marine sapphire, oceanic azure, and cobalt trench glass reflections.",
    type: "dark",
    colors: {
      bg: "#040f1f",
      accent: "#0ea5e9",
      highlight: "#2563eb",
    },
  },
  {
    id: "rose-quartz",
    name: "Rose Quartz",
    description: "Frosted champagne blush glass with delicate rose petals and warm gold.",
    type: "light",
    colors: {
      bg: "#fbf6f7",
      accent: "#db2777",
      highlight: "#f472b6",
    },
  },
  {
    id: "nordic-frost",
    name: "Nordic Frost",
    description: "Arctic glacial ice crystal, polar silver, and diamond specular highlights.",
    type: "dark",
    colors: {
      bg: "#08121a",
      accent: "#38bdf8",
      highlight: "#cbd5e1",
    },
  },
];

const THEME_STORAGE_KEY = "masterchat_theme";

export function getStoredTheme(): string {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (!stored || stored === "dark") {
    return "light";
  }
  return stored;
}

export function applyTheme(themeId: string): void {
  if (typeof window === "undefined") return;

  const targetId = themeId === "dark" ? "light" : themeId;
  const theme = THEMES.find((t) => t.id === targetId) || THEMES[0];
  const root = document.documentElement;

  // Remove existing theme classes
  THEMES.forEach((t) => {
    root.classList.remove(`theme-${t.id}`);
  });
  root.classList.remove("dark");
  root.classList.remove("light");

  // Apply dark or light baseline class
  if (theme.type === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.add("light");
  }

  // Apply specific theme class if not default light
  if (theme.id !== "light") {
    root.classList.add(`theme-${theme.id}`);
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme.id);

  // Dispatch custom event for real-time listener updates
  window.dispatchEvent(new CustomEvent("themechange", { detail: { themeId: theme.id } }));
}
