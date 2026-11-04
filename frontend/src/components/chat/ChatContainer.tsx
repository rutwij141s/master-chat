"use client";

import React, { useState, useEffect, useRef } from "react";
import { Message, Conversation, Citation } from "@/lib/types";
import { api } from "@/lib/api";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

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
  const abortControllerRef = useRef<AbortController | null>(null);

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
    // Find last user message
    const lastUserIdx = messages
      .map((m) => m.role)
      .lastIndexOf("user");
    if (lastUserIdx !== -1) {
      const userMsg = messages[lastUserIdx];
      // Truncate assistant answer and resend
      setMessages(messages.slice(0, lastUserIdx));
      handleSend(userMsg.content, false, selectedModel);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Scrollable Message List */}
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        onRegenerateLast={handleRegenerateLast}
        onSelectPrompt={(prompt) => handleSend(prompt, false, selectedModel)}
      />

      {/* Floating Glass Message Composer */}
      <MessageInput
        onSend={handleSend}
        onStop={handleStopStream}
        onOpenDocuments={onOpenDocuments}
        isStreaming={isStreaming}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
      />
    </div>
  );
};
