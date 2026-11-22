"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, Globe, Copy, Check } from "lucide-react";
import { Citation } from "@/lib/types";
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
    <div className="relative inline-block my-1 mr-1">
      {/* Brutalist Citation Chip */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold border-2 border-black bg-white hover:bg-neutral-100 text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all select-none cursor-pointer rounded-none uppercase"
      >
        {isWeb ? (
          <Globe className="w-3 h-3 stroke-[2.5]" />
        ) : (
          <FileText className="w-3 h-3 stroke-[2.5]" />
        )}
        <span className="truncate max-w-[120px]">{citation.filename}</span>
        {citation.page && <span className="opacity-75">p.{citation.page}</span>}
        <span className="px-1 bg-black text-white text-[9px] font-black">
          [{index + 1}]
        </span>
      </button>

      {/* Brutalist Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="absolute left-0 bottom-full mb-2 z-50 w-80 sm:w-96"
            >
              <div className="p-3 bg-white border-3 border-black shadow-brutal-lg rounded-none text-black">
                <div className="flex items-start justify-between gap-2 pb-2 border-b-2 border-black bg-[#f4f4f0] p-1.5 -m-1 mb-2">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <div className="p-1 border border-black bg-white">
                      {isWeb ? <Globe className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-black uppercase truncate text-black">
                        {citation.filename}
                      </p>
                      <p className="text-[10px] font-mono text-black/70">
                        {isWeb
                          ? "LIVE WEB GROUNDING"
                          : citation.page
                          ? `PAGE ${citation.page}`
                          : "DOCUMENT CHUNK"}
                        {citation.score !== undefined &&
                          ` • ${(citation.score * 100).toFixed(0)}% RELEVANCE`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-colors text-black"
                  >
                    <X className="w-3 h-3 stroke-[3]" />
                  </button>
                </div>

                <div className="p-2 border border-black bg-[#f8f8f6] font-mono text-xs text-black/90 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {citation.text}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 text-[10px] font-mono font-bold">
                  {citation.url ? (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 border border-black bg-[#00FF66] text-black font-black uppercase hover:underline"
                    >
                      OPEN SOURCE URL ↗
                    </a>
                  ) : (
                    <span className="text-black/50">[INGESTED VIA RAG PIPELINE]</span>
                  )}
                  <button
                    onClick={handleCopy}
                    className="px-2 py-0.5 border border-black bg-white hover:bg-black hover:text-white transition-colors uppercase font-black"
                  >
                    {copied ? "COPIED" : "COPY EXCERPT"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
