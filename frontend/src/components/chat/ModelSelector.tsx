"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, Cpu, Check, Layers, Brain, Code2, Users, Globe, Zap, Compass } from "lucide-react";
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
      id: "debate",
      name: "Debate Chat (4-Model Council)",
      provider: "multi",
      description: "Collaborative debate among all 4 models consolidated into a refined consensus",
      context_window: 128000,
      is_default: false,
    },
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
    {
      id: "gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash",
      provider: "gemini",
      description: "Google flagship fast multimodal model with 1M context",
      context_window: 1048576,
      is_default: false,
    },
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      provider: "gemini",
      description: "Google frontier intelligence model with 2M context",
      context_window: 2097152,
      is_default: false,
    },
    {
      id: "grok-2",
      name: "Grok 2",
      provider: "xai",
      description: "xAI state-of-the-art frontier model with deep reasoning & coding",
      context_window: 128000,
      is_default: false,
    },
    {
      id: "sonar-pro",
      name: "Perplexity Sonar Pro",
      provider: "perplexity",
      description: "Real-time web search intelligence with cited research",
      context_window: 200000,
      is_default: false,
    },
    {
      id: "sonar",
      name: "Perplexity Sonar",
      provider: "perplexity",
      description: "Fast web-grounded search assistant",
      context_window: 128000,
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

  const getProviderMeta = (m?: Model) => {
    const prov = (m?.provider || "").toLowerCase();
    const id = (m?.id || "").toLowerCase();

    if (id === "debate" || prov === "multi") {
      return {
        label: "Council",
        icon: <Users className="w-2.5 h-2.5" />,
        badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20",
        accent: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-500/20",
      };
    }
    if (prov === "anthropic" || id.includes("claude")) {
      return {
        label: "Anthropic",
        icon: <Cpu className="w-2.5 h-2.5" />,
        badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20",
        accent: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/20",
      };
    }
    if (prov === "gemini" || id.includes("gemini")) {
      return {
        label: "Google",
        icon: <Compass className="w-2.5 h-2.5" />,
        badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20",
        accent: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-500/20",
      };
    }
    if (prov === "xai" || id.includes("grok")) {
      return {
        label: "xAI",
        icon: <Zap className="w-2.5 h-2.5" />,
        badge: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20",
        accent: "text-zinc-600 dark:text-zinc-400",
        bg: "bg-zinc-500/20",
      };
    }
    if (prov === "perplexity" || id.includes("sonar")) {
      return {
        label: "Perplexity",
        icon: <Globe className="w-2.5 h-2.5" />,
        badge: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20",
        accent: "text-teal-600 dark:text-teal-400",
        bg: "bg-teal-500/20",
      };
    }
    return {
      label: "OpenAI",
      icon: <Sparkles className="w-2.5 h-2.5" />,
      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/20",
    };
  };

  const currentMeta = getProviderMeta(current);

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
        <div className={cn("flex items-center justify-center w-4 h-4 rounded-full", currentMeta.bg, currentMeta.accent)}>
          {currentMeta.icon}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground tracking-tight">{current?.name}</span>
          {!compact && (
            <span className={cn("text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-md font-semibold", currentMeta.badge)}>
              {currentMeta.label}
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
                    const meta = getProviderMeta(m);
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
                            <span className={cn("flex-shrink-0", meta.accent)}>{meta.icon}</span>
                            <span className="text-xs font-semibold">{m.name}</span>
                            <span
                              className={cn(
                                "text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-medium",
                                meta.badge
                              )}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-foreground/65 line-clamp-1 mt-0.5">
                            {m.description}
                          </span>

                          {/* Model Context & Features */}
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap text-[9px] text-foreground/60 font-mono">
                            {m.context_window && (
                              <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5">
                                {(m.context_window / 1000).toFixed(0)}k ctx
                              </span>
                            )}
                            {m.capabilities?.vision && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                Vision
                              </span>
                            )}
                            {m.capabilities?.web_search && (
                              <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                Web
                              </span>
                            )}
                          </div>
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
