"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { Message } from "@/lib/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { CitationPopover } from "./CitationPopover";
import { GlassCard } from "../ui/GlassCard";
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className={cn(
        "group flex w-full gap-3 py-3 px-2 sm:px-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-md text-white">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={cn("flex flex-col max-w-[85%] sm:max-w-[78%]", isUser && "items-end")}>
        {/* User / Assistant Header Meta */}
        <div className="flex items-center gap-2 mb-1 px-1 text-xs text-foreground/50">
          <span className="font-medium">{isUser ? "You" : message.model || "MasterChat AI"}</span>
          <span>•</span>
          <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {/* Message Glass Body */}
        {isEditing ? (
          <div className="w-full flex flex-col gap-2 p-3 liquid-glass-input rounded-2xl">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-transparent resize-none focus:outline-none text-sm"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
              >
                Save & Resend
              </button>
            </div>
          </div>
        ) : (
          <GlassCard
            variant={isUser ? "subtle" : "surface"}
            className={cn(
              "px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm text-foreground",
              isUser
                ? "bg-gradient-to-br from-indigo-600/90 to-blue-600/90 text-white rounded-3xl rounded-tr-sm border-white/20"
                : "rounded-3xl rounded-tl-sm border-white/30 dark:border-white/10"
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}

            {/* Citations section if present */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-1.5">
                  Sources & Grounding References
                </p>
                <div className="flex flex-wrap items-center">
                  {message.sources.map((cit, idx) => (
                    <CitationPopover key={cit.chunk_id || idx} citation={cit} index={idx} />
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* Message Actions Bar (Hover) */}
        {!isEditing && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-foreground/50",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            <button
              onClick={handleCopy}
              title="Copy message"
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {isUser ? (
              <button
                onClick={() => setIsEditing(true)}
                title="Edit message"
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    title="Regenerate response"
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setFeedback(feedback === "up" ? null : "up")}
                  title="Helpful"
                  className={cn(
                    "p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                    feedback === "up" ? "text-emerald-500" : "hover:text-foreground"
                  )}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setFeedback(feedback === "down" ? null : "down")}
                  title="Unhelpful"
                  className={cn(
                    "p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                    feedback === "down" ? "text-rose-500" : "hover:text-foreground"
                  )}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center bg-black/10 dark:bg-white/10 border border-white/20 shadow-sm text-foreground">
            <UserIcon className="w-4 h-4" />
          </div>
        </div>
      )}
    </motion.div>
  );
};
