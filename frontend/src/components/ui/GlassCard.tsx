"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  variant?: "surface" | "subtle" | "floating";
  lensEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = "surface",
  lensEffect = false,
  ...props
}) => {
  const variantStyles = {
    surface: "bg-white border-2 border-black shadow-brutal rounded-none",
    subtle: "bg-[#fafaf7] border-2 border-black shadow-brutal-sm rounded-none",
    floating: "bg-white border-3 border-black shadow-brutal-lg hover:shadow-brutal-xl hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150 rounded-none",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "relative overflow-hidden transition-all duration-150",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {/* Optional industrial grid watermark */}
      {lensEffect && (
        <div className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:12px_12px]" />
      )}

      {children}
    </motion.div>
  );
};

export const BrutalCard = GlassCard;
