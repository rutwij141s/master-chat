"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "glass" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = "glass",
  size = "md",
  children,
  className,
  disabled = false,
  ...props
}) => {
  const baseStyles =
    "relative inline-flex items-center justify-center font-medium transition-all select-none focus:outline-none disabled:opacity-40 disabled:pointer-events-none";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
    md: "px-4 py-2 text-sm rounded-2xl gap-2",
    lg: "px-6 py-3 text-base rounded-2xl gap-2.5",
    icon: "h-9 w-9 p-0 rounded-2xl items-center justify-center",
  };

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] border border-white/20",
    glass:
      "bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/15 text-foreground backdrop-blur-md border border-white/30 dark:border-white/10 shadow-sm active:scale-[0.98]",
    ghost:
      "hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 hover:text-foreground active:scale-[0.98]",
    danger:
      "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 active:scale-[0.98]",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      disabled={disabled}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {/* Specular top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-t-[inherit]" />
      {children}
    </motion.button>
  );
};
