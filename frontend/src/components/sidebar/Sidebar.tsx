"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FolderOpen,
  LogOut,
  Activity,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Palette,
  X,
} from "lucide-react";
import { getStoredTheme } from "@/lib/theme";
import { ThemeSelectorModal } from "../ui/ThemeSelectorModal";
import { Conversation, User, UsageSummary } from "@/lib/types";
import { api } from "@/lib/api";
import { ConversationItem } from "./ConversationItem";
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState<string>("opal-crisp");

  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  useEffect(() => {
    setCurrentThemeId(getStoredTheme());

    const handleThemeChange = (e: any) => {
      if (e.detail?.themeId) {
        setCurrentThemeId(e.detail.themeId);
      }
    };
    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

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
        if (onCloseMobile) onCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewChat, onCloseMobile]);

  const filteredConversations = conversations.filter((c) =>
    (c.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 sm:relative sm:z-30 h-full flex flex-col transition-all duration-200 p-2 sm:p-3",
          // Mobile drawer slide behavior
          isMobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0",
          // Desktop width handling
          isCollapsed ? "sm:w-20" : "w-72 sm:w-80"
        )}
      >
        <div className="h-full flex flex-col p-3 bg-white border-3 border-black shadow-brutal-md rounded-none overflow-hidden">
          {/* Top Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-black select-none">
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 border-2 border-black p-0.5 bg-white shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0">
                  <img
                    src="/logo.png"
                    alt="MasterChat"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-sm uppercase tracking-wider text-black leading-tight">
                    MASTERCHAT
                  </span>
                  <span className="text-[9px] font-mono font-bold text-black/60 uppercase leading-none">
                    BY RUTWIJ SUDKE
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={handleToggle}
                className="w-8 h-8 border-2 border-black p-0.5 bg-white shadow-[2px_2px_0px_0px_#000] mx-auto cursor-pointer hover:bg-neutral-100 transition-colors flex items-center justify-center shrink-0"
                title="Expand sidebar"
              >
                <img
                  src="/logo.png"
                  alt="MasterChat"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              {/* Close Button on Mobile */}
              <button
                onClick={onCloseMobile}
                className="sm:hidden w-7 h-7 flex items-center justify-center border-2 border-black bg-white text-black font-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                title="Close drawer"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>

              {/* Desktop Collapse/Expand Toggle */}
              <button
                onClick={handleToggle}
                className="hidden sm:flex w-7 h-7 items-center justify-center border-2 border-black bg-white text-black font-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                title={isCollapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                ) : (
                  <ChevronLeft className="w-4 h-4 stroke-[3]" />
                )}
              </button>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-col gap-2 mt-3">
            {/* New Chat Button */}
            <button
              onClick={() => {
                onNewChat();
                if (onCloseMobile) onCloseMobile();
              }}
              className={cn(
                "w-full py-2 bg-brutal-accent hover:bg-brutal-accentHover text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[5px_5px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center cursor-pointer",
                isCollapsed ? "justify-center px-1" : "justify-between px-3"
              )}
              title="New Chat Session (⌘K)"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 stroke-[3]" />
                {!isCollapsed && <span>NEW CHAT</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] px-1.5 py-0.2 border border-black bg-white text-black font-mono font-bold">
                  ⌘K
                </span>
              )}
            </button>

            {/* Search Filter (expanded only) */}
            {!isCollapsed && (
              <div className="relative mt-0.5">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-black/60 pointer-events-none stroke-[2.5]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="SEARCH ARCHIVES..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-mono font-bold uppercase border-2 border-black bg-white focus:bg-[#fffdf0] text-black placeholder:text-black/40 shadow-[2px_2px_0px_0px_#000] focus:shadow-[4px_4px_0px_0px_#000] focus:outline-none transition-all rounded-none"
                />
              </div>
            )}
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto mt-3 space-y-1 pr-0.5">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-1 py-1 text-[10px] font-mono font-black uppercase text-black/50 border-b border-black/10 mb-1">
                <span>// RECENT STREAMS</span>
                <span>{filteredConversations.length}</span>
              </div>
            )}

            {filteredConversations.length === 0 ? (
              !isCollapsed && (
                <div className="p-4 text-center text-xs font-mono font-bold text-black/40 border-2 border-dashed border-black/30 mt-2">
                  {search ? "NO ARCHIVES MATCHED" : "NO SESSIONS CREATED"}
                </div>
              )
            ) : (
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  isCollapsed={isCollapsed}
                  onSelect={() => {
                    onSelectConversation(conv.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  onDelete={onDeleteConversation}
                  onRename={onRenameConversation}
                />
              ))
            )}
          </div>

          {/* Bottom Utility Controls */}
          <div className="pt-2 border-t-2 border-black flex flex-col gap-1.5 bg-[#f4f4f0] p-1.5 mt-auto border-2">
            {/* Documents Manager Button */}
            <button
              onClick={() => {
                onOpenDocuments();
                if (onCloseMobile) onCloseMobile();
              }}
              className={cn(
                "w-full flex items-center gap-2 py-1.5 border-2 border-black bg-white hover:bg-neutral-100 text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer",
                isCollapsed ? "justify-center px-1" : "px-2.5"
              )}
              title="Knowledge Base & RAG Documents"
            >
              <FolderOpen className="w-3.5 h-3.5 stroke-[2.5]" />
              {!isCollapsed && <span>DOC LIBRARY</span>}
            </button>

            {/* Admin Dashboard Button (Visible to Administrators) */}
            {(user?.role === "admin" || user?.email === "demo@masterchat.ai" || user?.email?.startsWith("admin@")) && (
              <button
                onClick={() => {
                  router.push("/admin");
                  if (onCloseMobile) onCloseMobile();
                }}
                className={cn(
                  "w-full flex items-center gap-2 py-1.5 border-2 border-black bg-brutal-accent hover:bg-brutal-accentHover text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer",
                  isCollapsed ? "justify-center px-1" : "px-2.5"
                )}
                title="Admin Dashboard (Platform Usage & Costs)"
              >
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                {!isCollapsed && <span>ADMIN CONSOLE</span>}
              </button>
            )}

            {/* Usage Metrics Box */}
            {usage && !isCollapsed && (
              <div className="px-2 py-1 border-2 border-black bg-white text-[10px] font-mono font-bold flex items-center justify-between shadow-[2px_2px_0px_0px_#000]">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-black" />
                  <span>TOKENS:</span>
                </span>
                <span className="font-black text-black">
                  {usage.total_tokens.toLocaleString()} (${usage.total_estimated_cost.toFixed(3)})
                </span>
              </div>
            )}

            {/* User Profile & Theme Row */}
            <div className={cn("flex items-center justify-between pt-1", isCollapsed && "flex-col gap-1.5")}>
              <button
                onClick={() => setIsThemeModalOpen(true)}
                className="w-7 h-7 flex items-center justify-center border-2 border-black bg-white text-black hover:bg-brutal-accent transition-colors shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                title="Brutalist Theme Palette (8 Themes)"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {!isCollapsed && user && (
                <span className="text-[11px] font-mono font-bold text-black truncate max-w-[130px] border border-black px-1 bg-white">
                  {user.email.split("@")[0]}
                </span>
              )}

              <button
                onClick={onLogout}
                className="w-7 h-7 flex items-center justify-center border-2 border-black bg-white text-black hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Theme Selector Modal */}
        <ThemeSelectorModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
        />
      </aside>
    </>
  );
};
