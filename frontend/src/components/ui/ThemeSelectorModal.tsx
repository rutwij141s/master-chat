"use client";

import React, { useState, useEffect } from "react";
import { Check, Sparkles } from "lucide-react";
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
  const [activeThemeId, setActiveThemeId] = useState<string>("opal-crisp");

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
      title="Brutalist Theme Palette"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-2 border-black gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-black/70">
            Select an architectural color system. All palettes feature thick black borders & hard drop shadows.
          </p>
          <span className="text-xs font-mono font-black px-2 py-0.5 bg-black text-white shrink-0 self-start sm:self-auto">
            8 BRUTALIST SCHEMES
          </span>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[480px] overflow-y-auto pr-1">
          {THEMES.map((theme) => {
            const isActive = theme.id === activeThemeId;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={cn(
                  "p-4 text-left transition-all duration-150 border-2 border-black relative flex flex-col justify-between gap-3 group rounded-none cursor-pointer",
                  isActive
                    ? "bg-[#ffffff] shadow-[6px_6px_0px_0px_#000000] -translate-x-0.5 -translate-y-0.5 ring-2 ring-black"
                    : "bg-[#ffffff] hover:bg-neutral-50 shadow-[3px_3px_0px_0px_#000000] hover:shadow-[5px_5px_0px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5"
                )}
              >
                {/* Header: Name & Swatch */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    {/* Visual Color Block */}
                    <div className="flex items-center border-2 border-black shadow-[2px_2px_0px_0px_#000000] overflow-hidden">
                      <span
                        className="w-4 h-4 border-r border-black"
                        style={{ backgroundColor: theme.colors.bg }}
                      />
                      <span
                        className="w-4 h-4 border-r border-black"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                      <span
                        className="w-4 h-4"
                        style={{ backgroundColor: theme.colors.highlight }}
                      />
                    </div>
                    <span className="font-black text-sm uppercase tracking-wide text-black">
                      {theme.name}
                    </span>
                  </div>

                  {/* Active Indicator or Mode Badge */}
                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-black text-white flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                        <Check className="w-3 h-3 stroke-[3]" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase border border-black text-black group-hover:bg-black group-hover:text-white transition-colors">
                        SELECT
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-black/75 font-medium leading-relaxed">
                  {theme.description}
                </p>

                {/* Bottom Palette Stripe preview */}
                <div className="w-full h-2 border border-black flex">
                  <div className="w-1/2 h-full" style={{ backgroundColor: theme.colors.bg }} />
                  <div className="w-1/2 h-full" style={{ backgroundColor: theme.colors.accent }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </GlassModal>
  );
};
