"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/35 backdrop-blur-md"
          />

          {/* Modal Container */}
          <GlassCard
            variant="surface"
            className={`relative z-10 w-full ${maxWidth} max-h-[90vh] flex flex-col p-6 shadow-2xl border border-white/30 dark:border-white/10`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10">
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-foreground/70 hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto mt-4 pr-1">{children}</div>
          </GlassCard>
        </div>
      )}
    </AnimatePresence>
  );
};
