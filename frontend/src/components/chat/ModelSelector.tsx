"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, Cpu, Check } from "lucide-react";
import { Model } from "@/lib/types";
import { api } from "@/lib/api";
import { GlassCard } from "../ui/GlassCard";

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "openai",
      description: "Flagship omni-intelligence model",
      context_window: 128000,
      is_default: true,
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "openai",
      description: "Fast, efficient model for lightweight tasks",
      context_window: 128000,
      is_default: false,
    },
    {
      id: "claude-3-5-sonnet-20241022",
      name: "Claude 3.5 Sonnet",
      provider: "anthropic",
      description: "Deep reasoning, coding & analysis",
      context_window: 200000,
      is_default: false,
    },
    {
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
      provider: "anthropic",
      description: "Fastest response with top tier responsiveness",
      context_window: 200000,
      is_default: false,
    },
  ]);

  useEffect(() => {
    api.getModels().then(setModels).catch(() => {});
  }, []);

  const current = models.find((m) => m.id === selectedModel) || models[0];

  return (
    <div className="relative inline-block">
      {/* Model Selector Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/15 border border-white/30 dark:border-white/10 backdrop-blur-xl shadow-sm text-xs font-medium text-foreground transition-all"
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold">{current?.name}</span>
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-foreground/60">
          {current?.provider}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-foreground/50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className="absolute left-0 bottom-full mb-2 z-50 w-72"
            >
              <GlassCard
                variant="floating"
                className="p-2 bg-white/85 dark:bg-[#151726]/85 backdrop-blur-3xl border border-white/30 dark:border-white/10 shadow-2xl rounded-2xl"
              >
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">
                  Available AI Models
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {models.map((m) => {
                    const isSelected = m.id === selectedModel;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          onSelectModel(m.id);
                          setIsOpen(false);
                        }}
                        className={`flex items-start justify-between w-full p-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                            : "hover:bg-black/5 dark:hover:bg-white/5 text-foreground"
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">{m.name}</span>
                            <span className="text-[9px] uppercase px-1 rounded bg-black/5 dark:bg-white/10 font-mono text-foreground/60">
                              {m.provider}
                            </span>
                          </div>
                          <span className="text-[11px] text-foreground/60 line-clamp-1 mt-0.5">
                            {m.description}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />}
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
