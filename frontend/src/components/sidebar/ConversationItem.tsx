"use client";

import React, { useState } from "react";
import { MessageSquare, Trash2, Edit3, Check, X } from "lucide-react";
import { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  isCollapsed?: boolean;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
  isCollapsed = false,
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

  // Compact icon button in collapsed sidebar mode
  if (isCollapsed) {
    return (
      <button
        onClick={onSelect}
        className={cn(
          "w-10 h-10 mx-auto flex items-center justify-center border-2 border-black transition-all cursor-pointer rounded-none relative group",
          isActive
            ? "bg-brutal-accent text-black shadow-[2px_2px_0px_0px_#000000] -translate-x-0.5 -translate-y-0.5"
            : "bg-white text-black/70 hover:text-black hover:bg-neutral-100 hover:shadow-[2px_2px_0px_0px_#000000]"
        )}
        title={conversation.title || "Untitled Session"}
      >
        <MessageSquare className="w-4 h-4 stroke-[2.5]" />
      </button>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      className={cn(
        "group relative flex items-center justify-between px-2.5 py-2 cursor-pointer transition-all duration-100 select-none border-2 rounded-none",
        isActive
          ? "bg-brutal-accent border-black text-black font-black shadow-[3px_3px_0px_0px_#000000] -translate-x-0.5 -translate-y-0.5"
          : "bg-white border-black/30 hover:border-black text-black/85 hover:text-black hover:shadow-[2px_2px_0px_0px_#000000] hover:-translate-x-0.5"
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
        <MessageSquare
          className={cn(
            "w-3.5 h-3.5 flex-shrink-0 stroke-[2.5]",
            isActive ? "text-black" : "text-black/50 group-hover:text-black"
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
            className="w-full bg-white px-1.5 py-0.5 text-xs font-mono font-bold focus:outline-none border-2 border-black"
          />
        ) : (
          <span className="truncate text-xs font-bold tracking-tight">
            {conversation.title || "UNTITLED SESSION"}
          </span>
        )}
      </div>

      {/* Actions (Rename / Delete) */}
      <div className="flex items-center gap-1">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSaveRename}
              className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-colors text-black"
              title="Save"
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(false);
              }}
              className="p-1 border border-black bg-white hover:bg-red-500 hover:text-white transition-colors text-black"
              title="Cancel"
            >
              <X className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        ) : (
          (isHovered || isActive) && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 border border-black bg-white text-black hover:bg-black hover:text-white shadow-[1px_1px_0px_0px_#000] transition-colors"
                title="Rename chat"
              >
                <Edit3 className="w-3 h-3 stroke-[2.5]" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this conversation?")) {
                    onDelete(conversation.id);
                  }
                }}
                className="p-1 border border-black bg-white text-black hover:bg-red-500 hover:text-white shadow-[1px_1px_0px_0px_#000] transition-colors"
                title="Delete chat"
              >
                <Trash2 className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
