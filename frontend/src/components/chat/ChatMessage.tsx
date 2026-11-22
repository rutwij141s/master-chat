"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Message } from "@/lib/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { CitationPopover } from "./CitationPopover";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  onEdit,
}) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleToggleSpeak = () => {
    if (typeof window === "undefined") return;

    if (isPlayingAudio) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAudio(false);
      return;
    }

    const plainText = message.content
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/[`*#_~]/g, "")
      .trim();

    if (!plainText) return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(editContent);
    }
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "group flex w-full gap-2 sm:gap-3 py-2 px-1 sm:px-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Assistant Logo Badge */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
            <img
              src="/logo.png"
              alt="MasterChat"
              className="w-5 h-5 object-contain"
            />
          </div>
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={cn("flex flex-col max-w-[90%] sm:max-w-[82%]", isUser && "items-end")}>
        {/* Header Metadata Tag */}
        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-mono font-bold uppercase text-black/60">
          <span>{isUser ? "[OPERATOR]" : `[AGENT: ${message.model || "MASTERCHAT"}]`}</span>
          <span>•</span>
          <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {/* Message Brutalist Box Body */}
        {isEditing ? (
          <div className="w-full flex flex-col gap-2 p-3 bg-white border-2 border-black shadow-brutal rounded-none">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-white resize-none focus:outline-none text-xs sm:text-sm font-mono border-2 border-black p-2"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 font-bold uppercase border-2 border-black bg-white hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#000]"
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 font-black uppercase border-2 border-black bg-brutal-accent hover:bg-brutal-accentHover text-black shadow-[2px_2px_0px_0px_#000]"
              >
                SAVE & RESEND
              </button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "px-4 py-3 sm:px-5 sm:py-3.5 border-2 border-black shadow-brutal rounded-none",
              isUser
                ? "bg-brutal-accent text-black font-semibold"
                : "bg-white text-black"
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm sm:text-base font-bold leading-relaxed">{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}

            {/* Citations section if present */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-2.5 border-t-2 border-black">
                <p className="text-[10px] font-mono font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-black inline-block" />
                  <span>GROUNDING CITATIONS & PROVENANCE:</span>
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  {message.sources.map((cit, idx) => (
                    <CitationPopover key={cit.chunk_id || idx} citation={cit} index={idx} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Actions Bar */}
        {!isEditing && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1 opacity-70 group-hover:opacity-100 transition-opacity duration-150 text-black",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            <button
              onClick={handleCopy}
              title="Copy message"
              className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[1px_1px_0px_0px_#000]"
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {isUser ? (
              <button
                onClick={() => setIsEditing(true)}
                title="Edit message"
                className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[1px_1px_0px_0px_#000]"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={handleToggleSpeak}
                  title={isPlayingAudio ? "Stop speaking" : "Read aloud (Text-to-Speech)"}
                  className={cn(
                    "p-1 border border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[1px_1px_0px_0px_#000] cursor-pointer",
                    isPlayingAudio && "bg-black text-white"
                  )}
                >
                  {isPlayingAudio ? (
                    <VolumeX className="w-3.5 h-3.5 animate-pulse text-brutal-accent" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    title="Regenerate response"
                    className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[1px_1px_0px_0px_#000]"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setFeedback(feedback === "up" ? null : "up")}
                  title="Helpful"
                  className={cn(
                    "p-1 border border-black bg-white hover:bg-emerald-400 transition-colors shadow-[1px_1px_0px_0px_#000]",
                    feedback === "up" && "bg-emerald-400 text-black"
                  )}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setFeedback(feedback === "down" ? null : "down")}
                  title="Unhelpful"
                  className={cn(
                    "p-1 border border-black bg-white hover:bg-rose-400 transition-colors shadow-[1px_1px_0px_0px_#000]",
                    feedback === "down" && "bg-rose-400 text-black"
                  )}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
