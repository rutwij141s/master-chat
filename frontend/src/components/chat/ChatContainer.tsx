"use client";

import React, { useState, useEffect, useRef } from "react";
import { Message, Conversation, Citation } from "@/lib/types";
import { api } from "@/lib/api";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ModelSelector } from "./ModelSelector";
import { FileText, Database, Download, FileDown, Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  activeConversation: Conversation | null;
  onConversationCreated: (conv: Conversation) => void;
  onTitleUpdated: (id: string, title: string) => void;
  onOpenDocuments: () => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  activeConversation,
  onConversationCreated,
  onTitleUpdated,
  onOpenDocuments,
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

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check document availability for RAG
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
      // ignore in offline/unauthorized cases
    }
  };

  useEffect(() => {
    refreshDocuments();
  }, []);

  // Load conversation messages when activeConversation changes
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

    // 1. Optimistic User Message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      conversation_id: activeConversation?.id || "",
      role: "user",
      content: userText,
      created_at: new Date().toISOString(),
    };

    // 2. Empty Streaming Assistant Message
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

    // --- Specialized Command Routing: AI Image Generation ---
    if (userText.startsWith("/image ") || userText.toLowerCase().startsWith("generate image: ")) {
      const prompt = userText.startsWith("/image ")
        ? userText.slice(7).trim()
        : userText.slice(16).trim();

      try {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: `🎨 *Generating AI artwork for "${prompt}" with DALL-E 3...*` }
              : msg
          )
        );

        let convId = activeConversation?.id;
        if (!convId) {
          try {
            const createdConv = await api.createConversation(`Image: ${prompt.slice(0, 25)}`);
            convId = createdConv.id;
            onConversationCreated(createdConv);
          } catch {
            // fallback if offline
          }
        }

        const imgRes = await api.generateImage(prompt);
        const markdown = `### 🎨 AI Generated Artwork\n\n**Prompt:** "${imgRes.revised_prompt}"\n\n![${imgRes.revised_prompt}](${imgRes.url})\n\n*Resolution: ${imgRes.width}x${imgRes.height} • Provider: ${imgRes.provider}*`;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: markdown, isStreaming: false, conversation_id: convId || msg.conversation_id }
              : msg
          )
        );
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: `❌ Image generation failed: ${err.message || err}`, isStreaming: false }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
      }
      return;
    }

    // --- Specialized Command Routing: AI Video Generation ---
    if (userText.startsWith("/video ") || userText.toLowerCase().startsWith("generate video: ")) {
      const prompt = userText.startsWith("/video ")
        ? userText.slice(7).trim()
        : userText.slice(16).trim();

      try {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: `🎬 *Rendering cinematic video scene for "${prompt}"...*` }
              : msg
          )
        );

        let convId = activeConversation?.id;
        if (!convId) {
          try {
            const createdConv = await api.createConversation(`Video: ${prompt.slice(0, 25)}`);
            convId = createdConv.id;
            onConversationCreated(createdConv);
          } catch {
            // fallback if offline
          }
        }

        const videoRes = await api.generateVideo(prompt);
        const markdown = `### 🎬 AI Generated Video Scene\n\n**Scene Prompt:** "${videoRes.prompt}"\n\n[Watch Video Clip](${videoRes.video_url})\n\n*Format: ${videoRes.format.toUpperCase()} • Duration: ${videoRes.duration_seconds}s • Status: ${videoRes.status}*`;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: markdown, isStreaming: false, conversation_id: convId || msg.conversation_id }
              : msg
          )
        );
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: `❌ Video generation failed: ${err.message || err}`, isStreaming: false }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
      }
      return;
    }

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

  // --- Export Chat Conversation ---
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
    setExportSuccess("Markdown exported!");
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
    setExportSuccess("Plain text exported!");
    setTimeout(() => setExportSuccess(null), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Prominent Top Navigation Header Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-black/5 dark:border-white/10 backdrop-blur-xl bg-white/40 dark:bg-[#121422]/60 z-20">
        <div className="flex items-center gap-3">
          {/* Top Model Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 hidden sm:inline">
              Model:
            </span>
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              placement="bottom"
            />
          </div>

          {/* Active Conversation Title */}
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-black/10 dark:border-white/10 text-xs font-medium text-foreground/70 truncate max-w-[260px]">
            <span>{activeConversation?.title || "New Chat"}</span>
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
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 text-foreground/75 border border-white/20 text-xs font-medium transition-all cursor-pointer shadow-xs"
                title="Export conversation transcript"
              >
                {exportSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-foreground/60" />
                )}
                <span className="hidden sm:inline">
                  {exportSuccess || "Export"}
                </span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-52 p-1.5 rounded-2xl bg-white/95 dark:bg-[#181a29]/95 backdrop-blur-3xl border border-white/50 dark:border-white/15 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-foreground/45 border-b border-black/5 dark:border-white/10 mb-1">
                    Export Chat
                  </div>
                  <button
                    type="button"
                    onClick={exportAsMarkdown}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 text-foreground cursor-pointer transition-colors"
                  >
                    <FileDown className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div>
                      <div className="font-semibold">Markdown (.md)</div>
                      <div className="text-[10px] text-foreground/50">With formatted sources & code</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={exportAsText}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 text-foreground cursor-pointer transition-colors mt-0.5"
                  >
                    <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <div className="font-semibold">Plain Text (.txt)</div>
                      <div className="text-[10px] text-foreground/50">Clean raw conversation log</div>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs font-medium transition-all cursor-pointer shadow-xs"
              title="Click to view Knowledge Base documents"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold truncate max-w-[130px] sm:max-w-[200px]">
                {activeDocumentName || `${documentCount} docs`}
              </span>
              <span className="text-[9px] font-bold uppercase px-1 rounded bg-indigo-500/20">
                RAG Ready
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenDocuments}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/40 dark:bg-white/5 hover:bg-white/60 text-foreground/70 border border-white/20 text-xs font-medium transition-all cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Knowledge Base</span>
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

      {/* Floating Glass Message Composer */}
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
