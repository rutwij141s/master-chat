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
    surface: "liquid-glass",
    subtle: "liquid-glass-subtle rounded-2xl",
    floating: "liquid-glass shadow-2xl hover:shadow-glass-lg transition-shadow duration-300",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {/* Optional Lens Refraction SVG Filter overlay */}
      {lensEffect && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-15">
          <filter id="lensRefraction">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <rect width="100%" height="100%" filter="url(#lensRefraction)" fill="none" />
        </svg>
      )}

      {/* 1px inner specular highlight border */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/20 dark:border-white/10" />

      {children}
    </motion.div>
  );
};
