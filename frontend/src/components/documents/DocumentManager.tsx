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
        {/* Drag and Drop Zone - Brutalist industrial dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "p-6 border-3 border-dashed border-black rounded-none transition-all text-center cursor-pointer flex flex-col items-center justify-center shadow-brutal-sm",
            isDragging
              ? "bg-[#ffe600] border-black scale-[0.99]"
              : "bg-white hover:bg-black/5"
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

          <div className="w-12 h-12 border-2 border-black bg-black text-white flex items-center justify-center mb-3 shadow-brutal-xs">
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-xs font-black uppercase tracking-wider text-black">
            [+] Click to Upload or Drag & Drop Documents
          </p>
          <p className="text-[11px] font-mono text-neutral-600 mt-1">
            Supports PDF, DOCX, TXT, MD, CSV, JSON (Up to 25MB)
          </p>
        </div>

        {/* URL Ingestion Form */}
        <form onSubmit={handleUrlUpload} className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Or enter a web page URL to crawl & index..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono border-2 border-black bg-white rounded-none shadow-brutal-xs focus:outline-none focus:ring-0 text-black placeholder:text-neutral-400"
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
          <div className="flex items-center gap-2 p-3 border-2 border-black bg-[#ffe600] text-black text-xs font-mono font-bold uppercase shadow-brutal-xs animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-black" />
            <span>Parsing document, computing embeddings, and storing vector chunks...</span>
          </div>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 p-3 border-2 border-black bg-rose-200 text-rose-950 text-xs font-mono font-bold uppercase shadow-brutal-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Document List */}
        <div className="mt-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-black text-xs font-black uppercase tracking-wider font-mono text-black">
            <span>Indexed Documents ({documents.length})</span>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mt-2">
            {documents.length === 0 && !isLoading ? (
              <div className="p-6 text-center border-2 border-dashed border-black/30 font-mono text-xs text-neutral-500">
                NO DOCUMENTS INDEXED YET. UPLOAD FILES TO GROUND AI RESPONSES WITH RAG.
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border-2 border-black bg-white shadow-brutal-sm text-xs hover:translate-x-0.5 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 border-2 border-black bg-black text-white flex items-center justify-center shrink-0 shadow-brutal-xs">
                      {doc.file_type === "url" ? <Globe className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-black truncate max-w-[240px] sm:max-w-md">
                        {doc.filename}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-600 mt-0.5">
                        <span>{doc.file_size ? formatBytes(doc.file_size) : "WEB PAGE"}</span>
                        <span>•</span>
                        <span>{doc.chunk_count} CHUNKS</span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Pill */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 border-2 border-black text-[10px] font-mono font-black uppercase tracking-wider",
                        doc.status === "indexed"
                          ? "bg-[#22c55e] text-black"
                          : doc.status === "processing"
                          ? "bg-[#ffe600] text-black animate-pulse"
                          : "bg-[#ef4444] text-white"
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
                      className="p-1.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-all shadow-brutal-xs"
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
