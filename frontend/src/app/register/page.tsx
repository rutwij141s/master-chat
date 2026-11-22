"use client";

import React from "react";
import { AuthGlassCard } from "@/components/auth/AuthGlassCard";

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-background">
      {/* Neo-Brutalist Grid Background */}
      <div className="brutal-grid-bg" />

      <AuthGlassCard initialMode="register" />
    </div>
  );
}
