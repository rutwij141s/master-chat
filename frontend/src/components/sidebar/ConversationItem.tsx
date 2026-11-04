"use client";

import React, { useState } from "react";
import { MessageSquare, MoreVertical, Trash2, Edit3, Check, X } from "lucide-react";
import { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);

  const handleSaveRename = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (onRename && title.trim() !== conversation.title) {
      onRename(conversation.id, title.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      className={cn(
        "group relative flex items-center justify-between px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-150 select-none",
        isActive
          ? "bg-white/60 dark:bg-white/15 text-foreground font-semibold shadow-sm border border-white/40 dark:border-white/10"
          : "hover:bg-white/30 dark:hover:bg-white/5 text-foreground/75 hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
        <MessageSquare
          className={cn(
            "w-4 h-4 flex-shrink-0 transition-colors",
            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-foreground/45 group-hover:text-foreground/70"
          )}
        />

        {isEditing ? (
          <input
            type="text"
            value={title}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename(e);
              if (e.key === "Escape") setIsEditing(false);
            }}
            autoFocus
            className="w-full bg-white/50 dark:bg-black/30 px-1.5 py-0.5 rounded-md text-xs focus:outline-none border border-indigo-500"
          />
        ) : (
          <span className="truncate text-xs tracking-tight">{conversation.title || "Untitled Conversation"}</span>
        )}
      </div>

      {/* Actions (Rename / Delete) */}
      <div className="flex items-center gap-1">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSaveRename}
              className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-600"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(false);
              }}
              className="p-1 rounded-md hover:bg-rose-500/20 text-rose-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          (isHovered || isActive) && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-foreground/50 hover:text-foreground"
                title="Rename chat"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation.id);
                }}
                className="p-1 rounded-md hover:bg-rose-500/15 text-foreground/50 hover:text-rose-500"
                title="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
