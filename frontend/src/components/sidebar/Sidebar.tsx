"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  FolderOpen,
  LogOut,
  Moon,
  Sun,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Conversation, User, UsageSummary } from "@/lib/types";
import { api } from "@/lib/api";
import { ConversationItem } from "./ConversationItem";
import { GlassCard } from "../ui/GlassCard";
import { GlassButton } from "../ui/GlassButton";
import { cn } from "@/lib/utils";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenDocuments: () => void;
  user: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onOpenDocuments,
  user,
  onLogout,
}) => {
  const [search, setSearch] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  // Theme detection
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  };

  // Load usage tracking
  useEffect(() => {
    if (user) {
      api.getUsage().then(setUsage).catch(() => {});
    }
  }, [user]);

  // Keyboard shortcut Cmd+K / Ctrl+K for New Chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onNewChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewChat]);

  const filteredConversations = conversations.filter((c) =>
    (c.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside
      className={cn(
        "relative z-30 h-full flex flex-col transition-all duration-300 ease-in-out p-3",
        isCollapsed ? "w-20" : "w-72 sm:w-80"
      )}
    >
      <GlassCard
        variant="surface"
        className="h-full flex flex-col p-3 border border-white/40 dark:border-white/10 shadow-xl overflow-hidden rounded-3xl"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-sm font-bold text-xs">
                MC
              </div>
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                MasterChat
              </span>
            </div>
          )}

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-foreground/60 hover:text-foreground transition-colors ml-auto"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-2 mt-3">
          {/* New Chat Button */}
          <GlassButton
            variant="primary"
            size="md"
            onClick={onNewChat}
            className="w-full justify-between shadow-md"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {!isCollapsed && <span>New Chat</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 text-white/90 font-mono">
                ⌘K
              </span>
            )}
          </GlassButton>

          {/* Search Filter */}
          {!isCollapsed && (
            <div className="relative mt-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10 focus:outline-none focus:border-indigo-500/50 text-foreground placeholder:text-foreground/45"
              />
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto mt-3 space-y-1 pr-1">
          {!isCollapsed && (
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
              Recent Chats
            </div>
          )}

          {filteredConversations.length === 0 ? (
            !isCollapsed && (
              <div className="p-4 text-center text-xs text-foreground/45">
                {search ? "No matching conversations" : "No chats yet. Start a new one!"}
              </div>
            )
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={() => onSelectConversation(conv.id)}
                onDelete={onDeleteConversation}
                onRename={onRenameConversation}
              />
            ))
          )}
        </div>

        {/* Bottom Utility Controls */}
        <div className="pt-3 border-t border-black/5 dark:border-white/5 flex flex-col gap-1.5">
          {/* Documents Manager Pill */}
          <button
            onClick={onOpenDocuments}
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors text-xs font-medium text-foreground/80 hover:text-foreground"
            title="Knowledge Base & RAG Documents"
          >
            <FolderOpen className="w-4 h-4 text-indigo-500" />
            {!isCollapsed && <span>Document Library</span>}
          </button>

          {/* Usage Metrics Pill */}
          {usage && !isCollapsed && (
            <div className="px-3 py-1.5 rounded-2xl bg-black/5 dark:bg-white/5 text-[11px] text-foreground/60 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tokens</span>
              </span>
              <span className="font-mono font-semibold text-foreground/80">
                {usage.total_tokens.toLocaleString()} (${usage.total_estimated_cost.toFixed(3)})
              </span>
            </div>
          )}

          {/* User Profile & Theme Row */}
          <div className="flex items-center justify-between pt-1 px-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-foreground/70 hover:text-foreground transition-colors"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {!isCollapsed && user && (
              <span className="text-xs font-medium text-foreground/75 truncate max-w-[130px]">
                {user.email}
              </span>
            )}

            <button
              onClick={onLogout}
              className="p-2 rounded-xl hover:bg-rose-500/10 text-foreground/60 hover:text-rose-500 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>
    </aside>
  );
};
