"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ExternalLink, X, Globe, Copy, Check } from "lucide-react";
import { Citation } from "@/lib/types";
import { GlassCard } from "../ui/GlassCard";
import { cn } from "@/lib/utils";

interface CitationPopoverProps {
  citation: Citation;
  index: number;
}

export const CitationPopover: React.FC<CitationPopoverProps> = ({ citation, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isWeb = Boolean(citation.url) || citation.doc_id === "web";

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(citation.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="relative inline-block my-1 mr-1.5">
      {/* Citation Chip */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all select-none cursor-pointer active:scale-95",
          isWeb
            ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
        )}
      >
        {isWeb ? (
          <Globe className="w-3 h-3 text-emerald-500" />
        ) : (
          <FileText className="w-3 h-3 text-indigo-500" />
        )}
        <span className="truncate max-w-[140px]">{citation.filename}</span>
        {citation.page && <span className="opacity-75">p.{citation.page}</span>}
        <span
          className={cn(
            "px-1 rounded text-[10px] font-mono",
            isWeb ? "bg-emerald-500/20" : "bg-indigo-500/20"
          )}
        >
          [{index + 1}]
        </span>
      </button>

      {/* Glass Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop click to dismiss */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="absolute left-0 bottom-full mb-2 z-50 w-80 sm:w-96"
            >
              <GlassCard
                variant="floating"
                className="p-4 bg-white/95 dark:bg-[#181a29]/95 backdrop-blur-3xl border border-white/50 dark:border-white/15 shadow-2xl rounded-2xl"
              >
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div
                      className={cn(
                        "p-1.5 rounded-lg",
                        isWeb
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-indigo-500/15 text-indigo-500"
                      )}
                    >
                      {isWeb ? <Globe className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold truncate text-foreground">
                        {citation.filename}
                      </p>
                      <p className="text-[11px] text-foreground/60">
                        {isWeb
                          ? "Live Web Search Source"
                          : citation.page
                          ? `Document Page ${citation.page}`
                          : "Document Chunk"}
                        {citation.score !== undefined &&
                          ` • Grounding: ${(citation.score * 100).toFixed(0)}%`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-foreground/60 hover:text-foreground cursor-pointer transition-colors"
                      title="Copy cited text"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-foreground/60 hover:text-foreground cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Grounding Snippet */}
                <div className="mt-2.5 max-h-48 overflow-y-auto text-xs text-foreground/80 leading-relaxed font-sans bg-black/5 dark:bg-white/5 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
                  &ldquo;{citation.text}&rdquo;
                </div>

                {/* Web Link if available */}
                {citation.url && (
                  <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-foreground/50 truncate max-w-[200px]">
                      {citation.url}
                    </span>
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <span>Visit Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
