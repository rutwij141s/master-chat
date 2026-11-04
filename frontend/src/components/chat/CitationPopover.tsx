"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ExternalLink, X } from "lucide-react";
import { Citation } from "@/lib/types";
import { GlassCard } from "../ui/GlassCard";

interface CitationPopoverProps {
  citation: Citation;
  index: number;
}

export const CitationPopover: React.FC<CitationPopoverProps> = ({ citation, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block my-1 mr-1.5">
      {/* Citation Chip */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 transition-all select-none"
      >
        <FileText className="w-3 h-3 text-indigo-500" />
        <span className="truncate max-w-[140px]">{citation.filename}</span>
        {citation.page && <span className="opacity-75">p.{citation.page}</span>}
        <span className="px-1 rounded bg-indigo-500/20 text-[10px] font-mono">[{index + 1}]</span>
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
                className="p-4 bg-white/80 dark:bg-[#181a29]/80 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-2xl rounded-2xl"
              >
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-500">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold truncate text-foreground">
                        {citation.filename}
                      </p>
                      <p className="text-[11px] text-foreground/60">
                        {citation.page ? `Page ${citation.page}` : "Reference Chunk"}
                        {citation.score !== undefined && ` • Match: ${(citation.score * 100).toFixed(0)}%`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-foreground/60 hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Grounding Snippet */}
                <div className="mt-2.5 max-h-48 overflow-y-auto text-xs text-foreground/80 leading-relaxed font-sans bg-black/5 dark:bg-white/5 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
                  &ldquo;{citation.text}&rdquo;
                </div>
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
