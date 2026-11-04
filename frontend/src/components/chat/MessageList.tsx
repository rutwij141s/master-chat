"use client";

import React, { useRef, useEffect } from "react";
import { Sparkles, Compass, Lightbulb, Code2 } from "lucide-react";
import { Message } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { GlassCard } from "../ui/GlassCard";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onRegenerateLast?: () => void;
  onSelectPrompt?: (text: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming,
  onRegenerateLast,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Apple Glass Hero Icon */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="absolute inset-0 rounded-3xl bg-indigo-500 blur-xl opacity-30 animate-pulse pointer-events-none" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          How can I help you today?
        </h1>
        <p className="text-sm sm:text-base text-foreground/60 max-w-md mb-8 leading-relaxed">
          Experience multi-model intelligence, instant document grounding (RAG), and tool agents encased in Liquid Glass.
        </p>

        {/* Suggested Starter Prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
          {[
            {
              icon: <Compass className="w-4 h-4 text-blue-500" />,
              title: "Explore Ideas",
              prompt: "Explain how quantum computers differ from classical binary computers in simple terms.",
            },
            {
              icon: <Code2 className="w-4 h-4 text-emerald-500" />,
              title: "Code & Architecture",
              prompt: "Write a high-performance concurrent worker pool in Go with channels and graceful shutdown.",
            },
            {
              icon: <Lightbulb className="w-4 h-4 text-amber-500" />,
              title: "Math & Computations",
              prompt: "Calculate (450 * 12) / sqrt(144) + 2^5 and explain the steps.",
            },
            {
              icon: <Sparkles className="w-4 h-4 text-purple-500" />,
              title: "Document Synthesis",
              prompt: "Upload a document to search and extract grounded answers with citations.",
            },
          ].map((item, idx) => (
            <GlassCard
              key={idx}
              variant="subtle"
              onClick={() => onSelectPrompt && onSelectPrompt(item.prompt)}
              className="p-3.5 flex items-start gap-3 cursor-pointer hover:bg-white/40 dark:hover:bg-white/10 transition-all text-left group"
            >
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-semibold text-foreground">{item.title}</span>
                <span className="text-xs text-foreground/60 line-clamp-2 mt-0.5">{item.prompt}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 sm:px-6 py-4 space-y-2">
      <div className="max-w-4xl mx-auto space-y-2">
        {messages.map((message, idx) => (
          <ChatMessage
            key={message.id || idx}
            message={message}
            onRegenerate={idx === messages.length - 1 && message.role === "assistant" ? onRegenerateLast : undefined}
          />
        ))}

        {/* Streaming Skeleton Loader */}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-3 py-3 px-4">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-purple-500 text-white animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="liquid-glass px-4 py-2.5 rounded-2xl flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};
