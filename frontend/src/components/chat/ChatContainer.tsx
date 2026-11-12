"use client";

import React, { useState, useEffect, useRef } from "react";
import { Message, Conversation, Citation } from "@/lib/types";
import { api } from "@/lib/api";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ModelSelector } from "./ModelSelector";
import { FileText, Database, Layers } from "lucide-react";
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
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const handleSend = async (userText: string, useRag: boolean, model: string) => {
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

        {/* Right Header Status / Knowledge Base Button */}
        <div className="flex items-center gap-2">
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
