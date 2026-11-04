"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { DocumentItem } from "@/lib/types";
import { api } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/utils";
import { GlassModal } from "../ui/GlassModal";
import { GlassButton } from "../ui/GlassButton";
import { cn } from "@/lib/utils";

interface DocumentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentCountChange?: (count: number) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  isOpen,
  onClose,
  onDocumentCountChange,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
      if (onDocumentCountChange) {
        onDocumentCountChange(res.total);
      }
    } catch (err: any) {
      console.error("Failed to load documents", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      await api.uploadDocument(file);
      await fetchDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await api.uploadDocument(undefined, urlInput.trim());
      setUrlInput("");
      await fetchDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Failed to ingest URL");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDocument(id);
      setDocuments(documents.filter((d) => d.id !== id));
      if (onDocumentCountChange) {
        onDocumentCountChange(documents.length - 1);
      }
    } catch (err: any) {
      console.error("Delete failed", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Knowledge Base & Documents">
      <div className="space-y-5">
        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center",
            isDragging
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-black/10 dark:border-white/10 hover:border-indigo-500/50 hover:bg-black/5 dark:hover:bg-white/5"
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            accept=".pdf,.docx,.doc,.txt,.md,.markdown,.csv,.json"
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-sm font-semibold text-foreground">
            Click to upload or drag & drop files
          </p>
          <p className="text-xs text-foreground/50 mt-1">
            Supports PDF, DOCX, TXT, Markdown, CSV (up to 25MB)
          </p>
        </div>

        {/* URL Ingestion Form */}
        <form onSubmit={handleUrlUpload} className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45 pointer-events-none" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Or enter a web page URL to crawl & index..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:border-indigo-500 text-foreground placeholder:text-foreground/45"
            />
          </div>
          <GlassButton
            type="submit"
            variant="primary"
            size="sm"
            disabled={!urlInput.trim() || isUploading}
          >
            Ingest URL
          </GlassButton>
        </form>

        {/* Upload State Feedback */}
        {isUploading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Parsing document, computing embeddings, and storing vector chunks...</span>
          </div>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Document List */}
        <div className="mt-4">
          <div className="flex items-center justify-between pb-2 text-xs font-semibold uppercase tracking-wider text-foreground/50">
            <span>Indexed Documents ({documents.length})</span>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mt-1">
            {documents.length === 0 && !isLoading ? (
              <p className="text-center text-xs text-foreground/40 py-6">
                No documents indexed yet. Upload documents to ground AI responses with RAG.
              </p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500 flex-shrink-0">
                      {doc.file_type === "url" ? <Globe className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-foreground truncate max-w-[260px] sm:max-w-md">
                        {doc.filename}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-foreground/50 mt-0.5">
                        <span>{doc.file_size ? formatBytes(doc.file_size) : "Web Page"}</span>
                        <span>•</span>
                        <span>{doc.chunk_count} chunks</span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Pill */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                        doc.status === "indexed"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : doc.status === "processing"
                          ? "bg-amber-500/15 text-amber-600 animate-pulse"
                          : "bg-rose-500/15 text-rose-600"
                      )}
                    >
                      {doc.status === "indexed" && <CheckCircle2 className="w-3 h-3" />}
                      {doc.status === "processing" && <Clock className="w-3 h-3" />}
                      {doc.status === "failed" && <AlertCircle className="w-3 h-3" />}
                      {doc.status}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-500/15 text-foreground/45 hover:text-rose-500 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </GlassModal>
  );
};
