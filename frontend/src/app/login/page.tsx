"use client";

import React from "react";
import { AuthGlassCard } from "@/components/auth/AuthGlassCard";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Background Ambient Mesh Orbs */}
      <div className="liquid-mesh-bg">
        <div className="mesh-blob-1" />
        <div className="mesh-blob-2" />
        <div className="mesh-blob-3" />
      </div>

      <AuthGlassCard initialMode="login" />
    </div>
  );
}
