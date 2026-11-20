"use client";

import React, { useState, useEffect } from "react";
import { Check, Sparkles, Sun, Moon, Palette } from "lucide-react";
import { GlassModal } from "./GlassModal";
import { THEMES, Theme, getStoredTheme, applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeThemeId, setActiveThemeId] = useState<string>("dark");

  useEffect(() => {
    if (isOpen) {
      setActiveThemeId(getStoredTheme());
    }
  }, [isOpen]);

  const handleSelectTheme = (themeId: string) => {
    setActiveThemeId(themeId);
    applyTheme(themeId);
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Liquid Glass Theme Palette"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
          <p className="text-xs text-foreground/70">
            Select an aesthetic to transform ambient mesh lighting, glass refractive borders, and specular highlights.
          </p>
          <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold shrink-0 ml-2">
            10 Themes Available
          </span>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
          {THEMES.map((theme) => {
            const isActive = theme.id === activeThemeId;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={cn(
                  "p-3.5 rounded-2xl text-left transition-all duration-200 border relative flex flex-col justify-between gap-3 group",
                  isActive
                    ? "bg-purple-500/15 border-purple-500/40 shadow-md ring-1 ring-purple-500/30"
                    : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-black/5 dark:border-white/10"
                )}
              >
                {/* Header: Name & Swatch */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {/* Visual Color Swatches */}
                    <div className="flex items-center -space-x-1 p-1 rounded-xl bg-black/10 dark:bg-black/30 border border-white/10">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: theme.colors.bg }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: theme.colors.highlight }}
                      />
                    </div>
                    <span className="font-semibold text-xs text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {theme.name}
                    </span>
                  </div>

                  {/* Active Indicator or Mode Badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md font-mono bg-black/5 dark:bg-white/10 text-foreground/60">
                      {theme.type}
                    </span>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-foreground/60 line-clamp-2 leading-relaxed">
                  {theme.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-foreground/50">
          <span>Theme selection is saved to your browser session.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-foreground/10 hover:bg-foreground/15 font-semibold text-foreground transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
