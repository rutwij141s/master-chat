"use client";

import React, { useRef, useEffect } from "react";
import { Sparkles, Compass, Lightbulb, Code2, Terminal } from "lucide-react";
import { Message } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";

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
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center select-none overflow-y-auto">
        {/* Brutalist Hero Identity */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-3 sm:border-4 border-black p-2 bg-white shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
            <img
              src="/logo.png"
              alt="MasterChat"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 border-2 border-black bg-black text-white text-[10px] font-mono font-black uppercase mt-3 shadow-[2px_2px_0px_0px_#000]">
            <Terminal className="w-3 h-3 text-[#00FF66]" />
            <span>ENGINE v2.0 // DEVELOPED BY RUTWIJ SUDKE</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-black mb-3">
          HOW CAN I HELP YOU TODAY?
        </h1>
        <p className="text-xs sm:text-sm font-bold text-black/75 max-w-lg mb-8 leading-relaxed uppercase">
          ORCHESTRATE MULTI-MODEL DEBATE, REAL-TIME VECTOR RAG, AND TOOL AGENTS THROUGH A RAW BRUTALIST INTERFACE.
        </p>

        {/* Suggested Starter Prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl">
          {[
            {
              icon: <Compass className="w-4 h-4 stroke-[2.5]" />,
              title: "EXPLORE QUANTUM COMPUTING",
              prompt: "Explain how quantum computers differ from classical binary computers in simple terms.",
              tag: "SCIENCE",
            },
            {
              icon: <Code2 className="w-4 h-4 stroke-[2.5]" />,
              title: "CONCURRENT WORKER POOL",
              prompt: "Write a high-performance concurrent worker pool in Go with channels and graceful shutdown.",
              tag: "SYSTEMS",
            },
            {
              icon: <Lightbulb className="w-4 h-4 stroke-[2.5]" />,
              title: "MATHEMATICAL LOGIC",
              prompt: "Calculate (450 * 12) / sqrt(144) + 2^5 and explain the mathematical breakdown.",
              tag: "LOGIC",
            },
            {
              icon: <Sparkles className="w-4 h-4 stroke-[2.5]" />,
              title: "DOCUMENT KNOWLEDGE SYNTHESIS",
              prompt: "Upload a document to search and extract grounded answers with citations.",
              tag: "RAG",
            },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt && onSelectPrompt(item.prompt)}
              className="p-3.5 border-2 border-black bg-white hover:bg-[#fffdf0] shadow-[3px_3px_0px_0px_#000] hover:shadow-[5px_5px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] transition-all text-left flex flex-col justify-between gap-2.5 rounded-none cursor-pointer group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-7 h-7 border-2 border-black bg-brutal-accent flex items-center justify-center text-black">
                  {item.icon}
                </div>
                <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 border border-black bg-black text-white">
                  {item.tag}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-wide text-black group-hover:underline">
                  {item.title}
                </span>
                <span className="text-xs text-black/70 font-medium line-clamp-2 mt-0.5">
                  {item.prompt}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 sm:px-6 py-4 space-y-3">
      <div className="max-w-4xl mx-auto space-y-3">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onRegenerate={onRegenerateLast}
          />
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-brutal-accent text-black font-mono font-bold text-xs uppercase w-fit shadow-[2px_2px_0px_0px_#000] animate-pulse">
            <span className="w-2 h-2 bg-black inline-block animate-ping" />
            <span>STREAMING MODEL SYNTHESIS...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
