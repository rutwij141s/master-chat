"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, Cpu, Check, Layers } from "lucide-react";
import { Model } from "@/lib/types";
import { api } from "@/lib/api";
import { GlassCard } from "../ui/GlassCard";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  placement?: "top" | "bottom";
  className?: string;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  placement = "top",
  className,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "openai",
      description: "Flagship high-intelligence omni model",
      context_window: 128000,
      is_default: true,
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "openai",
      description: "Fast, efficient lightweight model",
      context_window: 128000,
      is_default: false,
    },
    {
      id: "claude-3-5-sonnet-20241022",
      name: "Claude 3.5 Sonnet",
      provider: "anthropic",
      description: "Top-tier reasoning, deep analysis & coding",
      context_window: 200000,
      is_default: false,
    },
    {
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
      provider: "anthropic",
      description: "Ultra-fast response with high reasoning capability",
      context_window: 200000,
      is_default: false,
    },
  ]);

  useEffect(() => {
    api
      .getModels()
      .then((data) => {
        if (data && data.length > 0) {
          setModels(data);
        }
      })
      .catch(() => {});
  }, []);

  const current = models.find((m) => m.id === selectedModel) || models[0];
  const isAnthropic = current?.provider === "anthropic" || current?.id?.includes("claude");

  const dropdownClasses =
    placement === "bottom"
      ? "absolute left-0 top-full mt-2 z-50 w-80 max-w-[90vw]"
      : "absolute left-0 bottom-full mb-2 z-50 w-80 max-w-[90vw]";

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Model Selector Button Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select AI Model"
        aria-expanded={isOpen}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-all select-none shadow-sm cursor-pointer",
          "bg-white/70 dark:bg-[#1a1d2e]/80 hover:bg-white/90 dark:hover:bg-[#23273e]/90",
          "border border-white/50 dark:border-white/15 backdrop-blur-xl",
          "text-xs font-medium text-foreground",
          isOpen && "ring-2 ring-indigo-500/40 border-indigo-500/50"
        )}
      >
        {isAnthropic ? (
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Cpu className="w-2.5 h-2.5" />
          </div>
        ) : (
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-2.5 h-2.5" />
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground tracking-tight">{current?.name}</span>
          {!compact && (
            <span
              className={cn(
                "text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-md font-semibold",
                isAnthropic
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
              )}
            >
              {current?.provider}
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-foreground/50 transition-transform duration-200",
            isOpen && "rotate-180 text-foreground"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: placement === "bottom" ? -6 : 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: placement === "bottom" ? -6 : 6 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className={dropdownClasses}
            >
              <GlassCard
                variant="floating"
                className="p-2.5 bg-white/95 dark:bg-[#151726]/95 backdrop-blur-3xl border border-white/50 dark:border-white/15 shadow-2xl rounded-2xl overflow-visible"
              >
                <div className="flex items-center justify-between px-2 py-1 border-b border-black/5 dark:border-white/10 mb-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Choose AI Model</span>
                  </div>
                  <span className="text-[10px] text-foreground/40 font-mono">
                    {models.length} Available
                  </span>
                </div>

                <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                  {models.map((m) => {
                    const isSelected = m.id === selectedModel;
                    const isMAnthropic = m.provider === "anthropic" || m.id.includes("claude");
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onSelectModel(m.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex items-start justify-between w-full p-2.5 rounded-xl text-left transition-all cursor-pointer",
                          isSelected
                            ? "bg-indigo-500/15 border border-indigo-500/40 text-indigo-700 dark:text-indigo-300 shadow-sm"
                            : "hover:bg-black/5 dark:hover:bg-white/5 text-foreground border border-transparent"
                        )}
                      >
                        <div className="flex flex-col pr-2">
                          <div className="flex items-center gap-1.5">
                            {isMAnthropic ? (
                              <Cpu className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            )}
                            <span className="text-xs font-semibold">{m.name}</span>
                            <span
                              className={cn(
                                "text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-medium",
                                isMAnthropic
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              )}
                            >
                              {m.provider}
                            </span>
                          </div>
                          <span className="text-[11px] text-foreground/65 line-clamp-1 mt-0.5">
                            {m.description}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
