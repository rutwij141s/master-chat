"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Neo-Brutalist Modal Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className={`relative z-10 w-full ${maxWidth} max-h-[90vh] flex flex-col bg-white border-3 sm:border-4 border-black shadow-brutal-xl rounded-none overflow-hidden`}
          >
            {/* Industrial Header Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#f4f4f0] border-b-3 border-black select-none">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-black inline-block" />
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-black">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center border-2 border-black bg-white text-black font-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                title="Close modal"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-4 sm:p-6 bg-white text-black">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const BrutalModal = GlassModal;
