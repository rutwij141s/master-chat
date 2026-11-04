"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip, Database, StopCircle } from "lucide-react";
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
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onStop,
  onOpenDocuments,
  isStreaming,
  selectedModel,
  onSelectModel,
  hasDocuments = false,
}) => {
  const [input, setInput] = useState("");
  const [useRag, setUseRag] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input.trim(), useRag, selectedModel);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Liquid Glass Floating Composer */}
      <GlassCard
        variant="floating"
        className="liquid-glass-input p-3 border border-white/40 dark:border-white/15 shadow-2xl rounded-3xl"
      >
        {/* Multiline Input Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, evaluate expressions, search documents..."
          rows={1}
          className="w-full bg-transparent px-3 py-1.5 text-sm sm:text-base text-foreground placeholder:text-foreground/45 resize-none focus:outline-none max-h-44 leading-relaxed"
        />

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between pt-2 px-1 border-t border-black/5 dark:border-white/5 mt-1">
          {/* Left Controls: Model Picker + RAG Toggle + File Attach */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

            {/* RAG Toggle */}
            <button
              onClick={() => setUseRag(!useRag)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all select-none border",
                useRag
                  ? "bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/40 shadow-sm"
                  : "bg-white/30 dark:bg-white/5 hover:bg-white/50 text-foreground/70 border-white/20"
              )}
              title="Ground response with your uploaded documents (RAG)"
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
              onClick={onOpenDocuments}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl text-xs font-medium bg-white/30 dark:bg-white/5 hover:bg-white/50 text-foreground/70 border border-white/20 transition-all select-none"
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
                onClick={onStop}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all active:scale-95"
                title="Stop streaming"
              >
                <StopCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSend}
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
