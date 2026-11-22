"use client";

import React, { useState, useEffect, useRef } from "react";
import { Message, Conversation, Citation } from "@/lib/types";
import { api } from "@/lib/api";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ModelSelector } from "./ModelSelector";
import { FileText, Database, Download, FileDown, Check, Globe, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  activeConversation: Conversation | null;
  onConversationCreated: (conv: Conversation) => void;
  onTitleUpdated: (id: string, title: string) => void;
  onOpenDocuments: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  activeConversation,
  onConversationCreated,
  onTitleUpdated,
  onOpenDocuments,
  onToggleSidebar,
  isSidebarCollapsed = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [activeDocumentName, setActiveDocumentName] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshDocuments = async () => {
    try {
      const res = await api.getDocuments();
      if (res && res.documents) {
        setDocumentCount(res.total || res.documents.length);
        if (res.documents.length > 0) {
          setActiveDocumentName(res.documents[0].filename);
        } else {
          setActiveDocumentName(null);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshDocuments();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      api
        .getMessages(activeConversation.id)
        .then(setMessages)
        .catch((err) => console.error("Failed to load messages", err));
    } else {
      setMessages([]);
    }
  }, [activeConversation?.id]);

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleSend = async (
    userText: string,
    useRag: boolean,
    model: string,
    useWebSearch?: boolean
  ) => {
    if (!userText.trim() || isStreaming) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      conversation_id: activeConversation?.id || "",
      role: "user",
      content: userText,
      created_at: new Date().toISOString(),
    };

    const assistantMsgId = `asst-${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      conversation_id: activeConversation?.id || "",
      role: "assistant",
      content: "",
      model: model,
      sources: [],
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedContent = "";
    let accumulatedCitations: Citation[] = [];

    try {
      await api.streamChat(
        {
          conversation_id: activeConversation?.id,
          message: userText,
          model: model,
          use_rag: useRag,
          use_web_search: useWebSearch,
        },
        (event) => {
          if (event.type === "token" && event.token) {
            accumulatedContent += event.token;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: accumulatedContent,
                      model: event.model || msg.model,
                    }
                  : msg
              )
            );
          } else if (event.type === "citation" && event.citations) {
            accumulatedCitations = event.citations;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, sources: accumulatedCitations }
                  : msg
              )
            );
          } else if (event.type === "done") {
            if (event.title && event.conversation_id) {
              onTitleUpdated(event.conversation_id, event.title);
            }
            if (!activeConversation && event.conversation_id) {
              onConversationCreated({
                id: event.conversation_id,
                user_id: "",
                title: event.title || userText.slice(0, 25),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      id: event.message_id || msg.id,
                      isStreaming: false,
                    }
                  : msg
              )
            );
          } else if (event.type === "error") {
            accumulatedContent += `\n\n[Error: ${event.error}]`;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: accumulatedContent, isStreaming: false }
                  : msg
              )
            );
          }
        },
        controller.signal
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    accumulatedContent ||
                    `Stream connection failed: ${err.message || "Unknown error"}`,
                  isStreaming: false,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerateLast = () => {
    const lastUserIdx = messages
      .map((m) => m.role)
      .lastIndexOf("user");
    if (lastUserIdx !== -1) {
      const userMsg = messages[lastUserIdx];
      setMessages(messages.slice(0, lastUserIdx));
      handleSend(userMsg.content, documentCount > 0, selectedModel);
    }
  };

  const exportAsMarkdown = () => {
    const title = activeConversation?.title || "MasterChat Transcript";
    const dateStr = new Date().toLocaleString();
    let md = `# ${title}\n*Exported from MasterChat on ${dateStr}*\n\n---\n\n`;

    messages.forEach((m) => {
      if (m.role === "user") {
        md += `### 👤 User\n\n${m.content}\n\n`;
      } else if (m.role === "assistant") {
        md += `### 🤖 Assistant (${m.model || selectedModel})\n\n${m.content}\n\n`;
        if (m.sources && m.sources.length > 0) {
          md += `**Grounding Citations & References:**\n`;
          m.sources.forEach((s, idx) => {
            const pageStr = s.page ? ` (Page ${s.page})` : "";
            const urlStr = s.url ? ` - [Visit Link](${s.url})` : "";
            md += `- [${idx + 1}] **${s.filename}**${pageStr}${urlStr}: "${s.text.slice(0, 150)}..."\n`;
          });
          md += `\n`;
        }
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "-") || "chat"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    setExportSuccess("EXPORTED MD");
    setTimeout(() => setExportSuccess(null), 2500);
  };

  const exportAsText = () => {
    const title = activeConversation?.title || "MasterChat Transcript";
    const dateStr = new Date().toLocaleString();
    let text = `========================================================\n${title}\nExported on: ${dateStr}\n========================================================\n\n`;

    messages.forEach((m) => {
      const sender = m.role === "user" ? "USER" : `ASSISTANT (${m.model || selectedModel})`;
      text += `[${sender} - ${new Date(m.created_at).toLocaleTimeString()}]:\n${m.content}\n\n`;
      if (m.sources && m.sources.length > 0) {
        text += `References:\n`;
        m.sources.forEach((s, idx) => {
          text += `  [${idx + 1}] ${s.filename}${s.page ? ` (p.${s.page})` : ""}${s.url ? ` <${s.url}>` : ""}\n`;
        });
        text += `\n`;
      }
      text += `--------------------------------------------------------\n\n`;
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "-") || "chat"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    setExportSuccess("EXPORTED TXT");
    setTimeout(() => setExportSuccess(null), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white border-3 border-black shadow-brutal-lg rounded-none">
      {/* Prominent Brutalist Top Navigation Header Bar */}
      <header className="flex items-center justify-between px-3 sm:px-5 py-2 bg-[#f4f4f0] border-b-3 border-black z-20 select-none">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sidebar Toggle Button */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="flex items-center justify-center p-1.5 bg-white hover:bg-brutal-accent text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer rounded-none transition-colors"
              title={isSidebarCollapsed ? "Expand sidebar (Cmd+B)" : "Collapse sidebar (Cmd+B)"}
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {/* Model Selector Section */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase text-black hidden sm:inline px-1 bg-black text-white">
              MODEL
            </span>
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              placement="bottom"
            />
          </div>

          {/* Active Conversation Title */}
          <div className="hidden md:flex items-center gap-1.5 pl-3 border-l-2 border-black text-xs font-mono font-bold text-black truncate max-w-[260px]">
            <span className="text-black/50">//</span>
            <span className="truncate uppercase">{activeConversation?.title || "NEW SESSION"}</span>
          </div>
        </div>

        {/* Right Header Status, Export & Knowledge Base Button */}
        <div className="flex items-center gap-2">
          {/* Export Dropdown Menu */}
          {messages.length > 0 && (
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-brutal-accent text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded-none"
                title="Export conversation transcript"
              >
                {exportSuccess ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>{exportSuccess || "EXPORT"}</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-56 p-1.5 bg-white border-3 border-black shadow-brutal-lg z-50 rounded-none">
                  <div className="px-2 py-1 text-[10px] font-mono font-black uppercase text-black bg-[#f4f4f0] border-b-2 border-black mb-1">
                    EXPORT ARCHIVE
                  </div>
                  <button
                    type="button"
                    onClick={exportAsMarkdown}
                    className="w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-brutal-accent flex items-center gap-2 text-black cursor-pointer transition-colors border border-black mb-1"
                  >
                    <FileDown className="w-4 h-4 stroke-[2.5] flex-shrink-0" />
                    <div>
                      <div className="font-black text-xs">MARKDOWN (.MD)</div>
                      <div className="text-[10px] font-mono text-black/60">Formatted citations & code</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={exportAsText}
                    className="w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-brutal-accent flex items-center gap-2 text-black cursor-pointer transition-colors border border-black"
                  >
                    <FileText className="w-4 h-4 stroke-[2.5] flex-shrink-0" />
                    <div>
                      <div className="font-black text-xs">PLAIN TEXT (.TXT)</div>
                      <div className="text-[10px] font-mono text-black/60">Raw conversation dump</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Knowledge Base Button */}
          {documentCount > 0 ? (
            <button
              type="button"
              onClick={onOpenDocuments}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-brutal-accent text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 text-xs font-bold uppercase transition-all cursor-pointer rounded-none"
              title="Click to view Knowledge Base documents"
            >
              <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="font-black truncate max-w-[120px] sm:max-w-[180px]">
                {activeDocumentName || `${documentCount} DOCS`}
              </span>
              <span className="text-[9px] font-mono font-black uppercase px-1 bg-black text-white">
                RAG ON
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenDocuments}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-neutral-100 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] text-xs font-black uppercase transition-all cursor-pointer rounded-none"
            >
              <Database className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">KNOWLEDGE BASE</span>
            </button>
          )}
        </div>
      </header>

      {/* Scrollable Message List */}
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        onRegenerateLast={handleRegenerateLast}
        onSelectPrompt={(prompt) => handleSend(prompt, documentCount > 0, selectedModel)}
      />

      {/* Brutalist Message Console */}
      <MessageInput
        onSend={handleSend}
        onStop={handleStopStream}
        onOpenDocuments={onOpenDocuments}
        isStreaming={isStreaming}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        hasDocuments={documentCount > 0}
        activeDocumentName={activeDocumentName}
      />
    </div>
  );
};
