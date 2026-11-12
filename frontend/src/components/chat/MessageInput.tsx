"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip, Database, StopCircle, FileText, Sparkles } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { ModelSelector } from "./ModelSelector";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (message: string, useRag: boolean, model: string) => void;
  onStop?: () => void;
  onOpenDocuments: () => void;
  isStreaming: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  hasDocuments?: boolean;
  activeDocumentName?: string | null;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onStop,
  onOpenDocuments,
  isStreaming,
  selectedModel,
  onSelectModel,
  hasDocuments = false,
  activeDocumentName,
}) => {
  const [input, setInput] = useState("");
  const [useRag, setUseRag] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Automatically enable RAG when documents are detected
  useEffect(() => {
    if (hasDocuments) {
      setUseRag(true);
    }
  }, [hasDocuments]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    if (!text || isStreaming) return;
    onSend(text, useRag, selectedModel);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleQuickSummarize = () => {
    const docName = activeDocumentName || "the uploaded document";
    const prompt = `Summarize ${docName} thoroughly. Provide an executive summary, key sections, main purpose, and core takeaways based on the document.`;
    handleSend(prompt);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Quick Document Action Chips when Knowledge Base is Active */}
      {hasDocuments && (
        <div className="flex items-center gap-2 mb-2 px-1 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 backdrop-blur-md">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-medium truncate max-w-[160px] sm:max-w-[240px]">
              {activeDocumentName || "Knowledge Base Ready"}
            </span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-500/25 font-bold uppercase">
              RAG Active
            </span>
          </div>

          <button
            type="button"
            onClick={handleQuickSummarize}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/15 text-foreground/80 border border-white/30 dark:border-white/10 backdrop-blur-md transition-all cursor-pointer font-medium text-xs active:scale-95 shadow-xs"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Summarize Document</span>
          </button>
        </div>
      )}

      {/* Liquid Glass Floating Composer (overflow-visible to prevent clipping popups) */}
      <GlassCard
        variant="floating"
        className="liquid-glass-input p-3 border border-white/50 dark:border-white/15 shadow-2xl rounded-3xl overflow-visible relative z-30"
      >
        {/* Multiline Input Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasDocuments
              ? "Ask questions or type 'summarize' to analyze your document..."
              : "Ask anything, evaluate expressions, search documents..."
          }
          rows={1}
          className="w-full bg-transparent px-3 py-1.5 text-sm sm:text-base text-foreground placeholder:text-foreground/45 resize-none focus:outline-none max-h-44 leading-relaxed"
        />

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between pt-2 px-1 border-t border-black/5 dark:border-white/10 mt-1">
          {/* Left Controls: Model Picker + RAG Toggle + File Attach */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
              placement="top"
            />

            {/* RAG Toggle */}
            <button
              type="button"
              onClick={() => setUseRag(!useRag)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all select-none border cursor-pointer",
                useRag
                  ? "bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/50 shadow-sm"
                  : "bg-white/40 dark:bg-white/5 hover:bg-white/60 text-foreground/70 border-white/30 dark:border-white/10"
              )}
              title={useRag ? "Document Grounding is ON" : "Turn ON to ground with uploaded documents"}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">RAG</span>
              <span
                className={cn(
                  "text-[10px] uppercase font-bold px-1 rounded",
                  useRag ? "bg-indigo-500/30 text-indigo-700 dark:text-indigo-300" : "opacity-60"
                )}
              >
                {useRag ? "ON" : "OFF"}
              </span>
            </button>

            {/* File Attach / Document Library Button */}
            <button
              type="button"
              onClick={onOpenDocuments}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl text-xs font-medium bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 text-foreground/70 border border-white/30 dark:border-white/10 transition-all select-none cursor-pointer"
              title="Manage knowledge documents"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Docs</span>
            </button>
          </div>

          {/* Right Control: Send or Stop Button */}
          <div className="flex items-center">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all active:scale-95 cursor-pointer"
                title="Stop streaming"
              >
                <StopCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className={cn(
                  "flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-2xl text-white shadow-md transition-all active:scale-95",
                  input.trim()
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 cursor-pointer"
                    : "bg-black/20 dark:bg-white/10 opacity-40 cursor-not-allowed"
                )}
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
