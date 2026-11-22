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
    "relative inline-flex items-center justify-center font-bold uppercase tracking-wider select-none focus:outline-none disabled:opacity-40 disabled:pointer-events-none rounded-none transition-all duration-100 border-2 border-black";

  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs gap-1.5 shadow-[2px_2px_0px_0px_#000000]",
    md: "px-3.5 py-1.5 text-xs sm:text-sm gap-2 shadow-[3px_3px_0px_0px_#000000]",
    lg: "px-5 py-2.5 text-sm sm:text-base gap-2.5 shadow-[4px_4px_0px_0px_#000000]",
    icon: "h-9 w-9 p-0 items-center justify-center shadow-[3px_3px_0px_0px_#000000]",
  };

  const variantStyles = {
    primary:
      "bg-brutal-accent text-black font-extrabold hover:bg-brutal-accentHover hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_0px_#000000]",
    glass:
      "bg-white text-black hover:bg-neutral-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000000]",
    ghost:
      "bg-transparent border-transparent hover:border-black hover:bg-black/5 text-black active:translate-x-0.5 active:translate-y-0.5 shadow-none hover:shadow-[2px_2px_0px_0px_#000000]",
    danger:
      "bg-red-500 text-white font-extrabold hover:bg-red-600 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_0px_#000000]",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      disabled={disabled}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const BrutalButton = GlassButton;
