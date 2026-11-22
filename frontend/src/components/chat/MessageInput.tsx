"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Paperclip,
  Database,
  StopCircle,
  FileText,
  Sparkles,
  Globe,
  Mic,
  MicOff,
  Users,
} from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (message: string, useRag: boolean, model: string, useWebSearch?: boolean) => void;
  onStop?: () => void;
  onOpenDocuments: () => void;
  isStreaming: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  hasDocuments?: boolean;
  activeDocumentName?: string | null;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onStop,
  onOpenDocuments,
  isStreaming,
  selectedModel,
  onSelectModel,
  hasDocuments = false,
  activeDocumentName,
}) => {
  const [input, setInput] = useState("");
  const [useRag, setUseRag] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (hasDocuments) {
      setUseRag(true);
    }
  }, [hasDocuments]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (typeof window === "undefined") return;

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech-to-Text recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let initialText = input;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInput(initialText ? `${initialText} ${currentTranscript.trim()}` : currentTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition", e);
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    if (!text || isStreaming) return;
    onSend(text, useRag, selectedModel, useWebSearch);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleQuickSummarize = () => {
    const docName = activeDocumentName || "the uploaded document";
    const prompt = `Summarize ${docName} thoroughly. Provide an executive summary, key sections, main purpose, and core takeaways based on the document.`;
    handleSend(prompt);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 pb-3">
      {/* Quick Action Chips: Documents */}
      {hasDocuments && (
        <div className="flex items-center gap-2 mb-2 px-1 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 border-2 border-black bg-white text-black font-mono font-bold uppercase shadow-[2px_2px_0px_0px_#000]">
            <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="truncate max-w-[160px] sm:max-w-[240px]">
              {activeDocumentName || "KNOWLEDGE BASE READY"}
            </span>
            <span className="text-[9px] px-1 bg-black text-white font-black">
              RAG ACTIVE
            </span>
          </div>

          <button
            type="button"
            onClick={handleQuickSummarize}
            className="flex items-center gap-1 px-2.5 py-1 border-2 border-black bg-brutal-accent hover:bg-brutal-accentHover text-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 stroke-[2.5]" />
            <span>SUMMARIZE DOC</span>
          </button>
        </div>
      )}

      {/* Brutalist Console Composer */}
      <div className="bg-white border-3 border-black shadow-brutal-md p-2.5 sm:p-3 relative z-30 rounded-none">
        {/* Multiline Input Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedModel === "debate"
              ? "COMMAND COUNCIL: Enter query for multi-model consensus synthesis..."
              : hasDocuments
              ? "ENTER QUERY OR 'SUMMARIZE' FOR DOCUMENT RAG ANALYSIS..."
              : useWebSearch
              ? "QUERY ENGINE WITH REAL-TIME WEB GROUNDING..."
              : "ENTER INSTRUCTION OR PROMPT TO DISPATCH TO AGENT..."
          }
          rows={1}
          className="w-full bg-white px-2 py-1 text-xs sm:text-sm font-mono font-bold text-black placeholder:text-black/40 resize-none focus:outline-none max-h-44 leading-relaxed rounded-none"
        />

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between pt-2 px-0.5 border-t-2 border-black mt-1 gap-2">
          {/* Left Controls: Model Picker + Debate + RAG + Web + Docs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
              placement="top"
            />

            {/* Debate Chat Mode Toggle */}
            <button
              type="button"
              onClick={() => onSelectModel(selectedModel === "debate" ? "gpt-4o" : "debate")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold border-2 border-black transition-all cursor-pointer select-none rounded-none shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5",
                selectedModel === "debate"
                  ? "bg-[#FFE600] text-black font-black"
                  : "bg-white text-black hover:bg-neutral-100"
              )}
              title="Debate Chat: Consult 4 AI models simultaneously"
            >
              <Users className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">COUNCIL</span>
              <span className="text-[9px] font-black uppercase px-1 bg-black text-white">
                {selectedModel === "debate" ? "ON" : "OFF"}
              </span>
            </button>

            {/* RAG Toggle */}
            <button
              type="button"
              onClick={() => setUseRag(!useRag)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold border-2 border-black transition-all cursor-pointer select-none rounded-none shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5",
                useRag
                  ? "bg-black text-white font-black"
                  : "bg-white text-black hover:bg-neutral-100"
              )}
              title={useRag ? "Document Grounding is ON" : "Turn ON to ground with uploaded documents"}
            >
              <Database className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">RAG</span>
              <span className={cn(
                "text-[9px] font-black uppercase px-1",
                useRag ? "bg-white text-black" : "bg-black text-white"
              )}>
                {useRag ? "ON" : "OFF"}
              </span>
            </button>

            {/* Web Search Toggle */}
            <button
              type="button"
              onClick={() => setUseWebSearch(!useWebSearch)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold border-2 border-black transition-all cursor-pointer select-none rounded-none shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5",
                useWebSearch
                  ? "bg-[#00FF66] text-black font-black"
                  : "bg-white text-black hover:bg-neutral-100"
              )}
              title={useWebSearch ? "Web Search Grounding is ON" : "Turn ON to search the web live"}
            >
              <Globe className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">WEB</span>
              <span className="text-[9px] font-black uppercase px-1 bg-black text-white">
                {useWebSearch ? "ON" : "OFF"}
              </span>
            </button>

            {/* File Attach / Document Library Button */}
            <button
              type="button"
              onClick={onOpenDocuments}
              className="flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold bg-white hover:bg-neutral-100 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all select-none cursor-pointer rounded-none active:translate-x-0.5 active:translate-y-0.5"
              title="Manage knowledge documents"
            >
              <Paperclip className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden md:inline">DOCS</span>
            </button>
          </div>

          {/* Right Control: Dictation Mic & Send/Stop Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Voice Dictation (Speech-to-Text) Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border-2 border-black transition-all cursor-pointer rounded-none shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5",
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-white hover:bg-neutral-100 text-black"
              )}
              title={
                isListening
                  ? "Listening... Click to stop (Speech-to-Text)"
                  : "Dictate with voice (Speech-to-Text)"
              }
            >
              {isListening ? (
                <MicOff className="w-4 h-4 stroke-[3]" />
              ) : (
                <Mic className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>

            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border-2 border-black bg-red-500 hover:bg-red-600 text-white shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer rounded-none"
                title="Stop streaming"
              >
                <StopCircle className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className={cn(
                  "w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border-2 border-black transition-all rounded-none shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5",
                  input.trim()
                    ? "bg-brutal-accent hover:bg-brutal-accentHover text-black cursor-pointer"
                    : "bg-neutral-200 text-black/40 cursor-not-allowed"
                )}
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
