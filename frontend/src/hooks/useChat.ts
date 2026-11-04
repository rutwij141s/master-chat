"use client";

import { useState, useRef, useCallback } from "react";
import { Message, Citation } from "@/lib/types";
import { api } from "@/lib/api";

export function useChat(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      text: string,
      options: {
        model?: string;
        useRag?: boolean;
        docIds?: string[];
        onDone?: (title?: string, newConvId?: string) => void;
      } = {}
    ) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        conversation_id: conversationId || "",
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };

      const asstId = `a-${Date.now()}`;
      const asstMsg: Message = {
        id: asstId,
        conversation_id: conversationId || "",
        role: "assistant",
        content: "",
        model: options.model || "gpt-4o",
        sources: [],
        created_at: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, asstMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      let accText = "";
      let accCitations: Citation[] = [];

      try {
        await api.streamChat(
          {
            conversation_id: conversationId,
            message: text,
            model: options.model,
            use_rag: options.useRag,
            doc_ids: options.docIds,
          },
          (event) => {
            if (event.type === "token" && event.token) {
              accText += event.token;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === asstId ? { ...m, content: accText, model: event.model || m.model } : m
                )
              );
            } else if (event.type === "citation" && event.citations) {
              accCitations = event.citations;
              setMessages((prev) =>
                prev.map((m) => (m.id === asstId ? { ...m, sources: accCitations } : m))
              );
            } else if (event.type === "done") {
              if (options.onDone) {
                options.onDone(event.title, event.conversation_id);
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === asstId ? { ...m, id: event.message_id || m.id, isStreaming: false } : m
                )
              );
            } else if (event.type === "error") {
              accText += `\n\n[Error: ${event.error}]`;
              setMessages((prev) =>
                prev.map((m) => (m.id === asstId ? { ...m, content: accText, isStreaming: false } : m))
              );
            }
          },
          controller.signal
        );
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [conversationId, isStreaming]
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  return { messages, setMessages, isStreaming, sendMessage, stop };
}

