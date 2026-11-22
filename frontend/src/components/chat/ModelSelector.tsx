"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Sparkles,
  Cpu,
  Users,
  Compass,
  Zap,
  Globe,
  Check,
} from "lucide-react";
import { Model } from "@/lib/types";
import { api } from "@/lib/api";
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
        label: "COUNCIL",
        icon: <Users className="w-3 h-3 stroke-[2.5]" />,
        badge: "bg-brutal-accent text-black border border-black font-black",
      };
    }
    if (prov === "anthropic" || id.includes("claude")) {
      return {
        label: "ANTHROPIC",
        icon: <Cpu className="w-3 h-3 stroke-[2.5]" />,
        badge: "bg-[#FFB800] text-black border border-black font-black",
      };
    }
    if (prov === "gemini" || id.includes("gemini")) {
      return {
        label: "GOOGLE",
        icon: <Compass className="w-3 h-3 stroke-[2.5]" />,
        badge: "bg-[#00E5FF] text-black border border-black font-black",
      };
    }
    if (prov === "xai" || id.includes("grok")) {
      return {
        label: "XAI",
        icon: <Zap className="w-3 h-3 stroke-[2.5]" />,
        badge: "bg-black text-white border border-black font-black",
      };
    }
    if (prov === "perplexity" || id.includes("sonar")) {
      return {
        label: "PERPLEXITY",
        icon: <Globe className="w-3 h-3 stroke-[2.5]" />,
        badge: "bg-[#00FF66] text-black border border-black font-black",
      };
    }
    return {
      label: "OPENAI",
      icon: <Sparkles className="w-3 h-3 stroke-[2.5]" />,
      badge: "bg-white text-black border border-black font-black",
    };
  };

  const currentMeta = getProviderMeta(current);

  const dropdownClasses =
    placement === "bottom"
      ? "absolute left-0 top-full mt-1.5 z-50 w-80 max-w-[90vw]"
      : "absolute left-0 bottom-full mb-1.5 z-50 w-80 max-w-[90vw]";

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Model Selector Button Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select AI Model"
        aria-expanded={isOpen}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 transition-all select-none cursor-pointer rounded-none border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 text-xs font-bold text-black uppercase",
          isOpen && "bg-[#fffdf0]"
        )}
      >
        <span className="p-0.5 border border-black bg-[#f4f4f0]">
          {currentMeta.icon}
        </span>
        <span className="truncate max-w-[140px] tracking-tight">{current?.name || "Select Model"}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 stroke-[3] transition-transform duration-150 ml-0.5",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Brutalist Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={cn(
              dropdownClasses,
              "bg-white border-3 border-black shadow-brutal-lg p-1.5 rounded-none animate-in fade-in zoom-in-95 duration-100"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono font-black uppercase text-black bg-[#f4f4f0] border-b-2 border-black mb-1">
              <span>// SELECT ENGINE [{models.length}]</span>
              <span>CTX WINDOW</span>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto space-y-1 pr-0.5">
              {models.map((model) => {
                const isSelected = model.id === selectedModel;
                const meta = getProviderMeta(model);
                const ctxK = model.context_window
                  ? model.context_window >= 1000000
                    ? `${(model.context_window / 1000000).toFixed(0)}M`
                    : `${Math.round(model.context_window / 1000)}k`
                  : null;

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-start justify-between gap-2 p-2 text-left transition-all border border-black cursor-pointer rounded-none",
                      isSelected
                        ? "bg-brutal-accent text-black font-black shadow-[2px_2px_0px_0px_#000]"
                        : "bg-white hover:bg-neutral-100 text-black"
                    )}
                  >
                    <div className="flex items-start gap-2 overflow-hidden flex-1">
                      <div className="p-1 border border-black bg-white shrink-0 mt-0.5">
                        {meta.icon}
                      </div>
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black uppercase tracking-tight truncate">
                            {model.name}
                          </span>
                          <span className={cn("text-[9px] font-mono px-1 py-0.2", meta.badge)}>
                            {meta.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-black/65 font-medium line-clamp-1 mt-0.5">
                          {model.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {ctxK && (
                        <span className="text-[9px] font-mono font-bold px-1 border border-black bg-[#f4f4f0] text-black">
                          {ctxK}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 stroke-[3] text-black" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
