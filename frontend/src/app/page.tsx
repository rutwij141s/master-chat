"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Conversation, User } from "@/lib/types";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { DocumentManager } from "@/components/documents/DocumentManager";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // Authentication check & initial load
  useEffect(() => {
    const storedUser = localStorage.getItem("masterchat_user");
    const accessToken = localStorage.getItem("masterchat_access_token");

    if (storedUser && accessToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser({ id: "4fd1629e-5f63-4135-80e8-807a1632c551", email: "demo@masterchat.ai" });
      }
    } else {
      // Auto-authenticate as demo user to ensure valid JWT token is set for immediate testing
      api
        .login("demo@masterchat.ai", "Password123!")
        .then((res) => {
          setUser(res.user);
        })
        .catch((err) => {
          console.warn("Auto demo login note:", err);
          setUser({ id: "4fd1629e-5f63-4135-80e8-807a1632c551", email: "demo@masterchat.ai" });
        });
    }
  }, []);

  // Fetch conversations
  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
      if (data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0].id);
      }
    } catch (err) {
      console.warn("Could not load conversations from gateway:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  const handleNewChat = () => {
    setActiveConversationId(null);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (err) {
      console.error("Failed to delete conversation", err);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  const handleConversationCreated = (newConv: Conversation) => {
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const handleTitleUpdated = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  const handleLogout = () => {
    api.clearTokens();
    setUser(null);
    router.push("/login");
  };

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || null;

  return (
    <main className="relative flex h-screen w-screen overflow-hidden">
      {/* Liquid Mesh Background Orbs */}
      <div className="liquid-mesh-bg">
        <div className="mesh-blob-1" />
        <div className="mesh-blob-2" />
        <div className="mesh-blob-3" />
      </div>

      {/* Glass Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onOpenDocuments={() => setIsDocumentsOpen(true)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Glass Chat Stage */}
      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden p-2 sm:p-3 pl-0 sm:pl-0">
        <ChatContainer
          activeConversation={activeConversation}
          onConversationCreated={handleConversationCreated}
          onTitleUpdated={handleTitleUpdated}
          onOpenDocuments={() => setIsDocumentsOpen(true)}
        />
      </div>

      {/* Documents Modal */}
      <DocumentManager
        isOpen={isDocumentsOpen}
        onClose={() => setIsDocumentsOpen(false)}
      />
    </main>
  );
}
