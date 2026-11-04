"use client";

import { useState, useEffect, useCallback } from "react";
import { DocumentItem } from "@/lib/types";
import { api } from "@/lib/api";

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadFile = async (file: File) => {
    const doc = await api.uploadDocument(file);
    await fetchDocuments();
    return doc;
  };

  const uploadUrl = async (url: string) => {
    const doc = await api.uploadDocument(undefined, url);
    await fetchDocuments();
    return doc;
  };

  const deleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return {
    documents,
    isLoading,
    error,
    fetchDocuments,
    uploadFile,
    uploadUrl,
    deleteDocument,
  };
}

