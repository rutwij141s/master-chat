"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail, User, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface AuthGlassCardProps {
  initialMode?: "login" | "register";
}

export const AuthGlassCard: React.FC<AuthGlassCardProps> = ({
  initialMode = "login",
}) => {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(initialMode === "register");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Sync mode with prop if it changes
  useEffect(() => {
    setIsSignUp(initialMode === "register");
  }, [initialMode]);

  const switchMode = (signUp: boolean) => {
    setIsSignUp(signUp);
    setLoginError(null);
    setRegisterError(null);
    if (typeof window !== "undefined") {
      const newUrl = signUp ? "/register" : "/login";
      window.history.replaceState(null, "", newUrl);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      await api.login(loginEmail, loginPassword);
      router.push("/");
    } catch (err: any) {
      setLoginError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterLoading(true);

    if (registerPassword.length < 8) {
      setRegisterError("Password must be at least 8 characters long.");
      setRegisterLoading(false);
      return;
    }

    try {
      await api.register(registerEmail, registerPassword, registerName);
      router.push("/");
    } catch (err: any) {
      setRegisterError(err.message || "Failed to create account. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full flex items-center justify-center p-2 sm:p-4">
      {/* Sliding Glass Card Container */}
      <div
        className={`auth-glass-container ${isSignUp ? "panel-active" : ""}`}
        id="authWrapper"
      >
        {/* =========================================================
            1. CREATE ACCOUNT FORM (Left box, slides right on active)
            ========================================================= */}
        <div className="auth-form-box register-form-box">
          <form
            onSubmit={handleRegisterSubmit}
            className="w-full h-full flex flex-col items-center justify-center px-6 sm:px-12 py-8 text-center"
          >
            {/* Top Logo Badge */}
            <div className="w-11 h-11 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Create Account
            </h1>

            {/* Social Links */}
            <div className="flex items-center justify-center gap-3 my-3">
              {/* Google */}
              <button
                type="button"
                aria-label="Google Sign In"
                className="w-10 h-10 rounded-full bg-white/70 hover:bg-white border border-black/5 hover:border-indigo-400 text-foreground/80 hover:text-indigo-600 flex items-center justify-center shadow-xs transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.8h6.887C18.2 16.16 15.64 18.5 12.24 18.5c-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5c1.63 0 3.12.6 4.27 1.59l2.7-2.7C17.58 2.87 15.09 2 12.24 2 6.7 2 2.2 6.5 2.2 12s4.5 10 10.04 10c9.24 0 10.32-8.6 9.6-11.715H12.24z" />
                </svg>
              </button>

              {/* LinkedIn */}
              <button
                type="button"
                aria-label="LinkedIn Sign In"
                className="w-10 h-10 rounded-full bg-white/70 hover:bg-white border border-black/5 hover:border-indigo-400 text-foreground/80 hover:text-indigo-600 flex items-center justify-center shadow-xs transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </button>

              {/* Facebook */}
              <button
                type="button"
                aria-label="Facebook Sign In"
                className="w-10 h-10 rounded-full bg-white/70 hover:bg-white border border-black/5 hover:border-indigo-400 text-foreground/80 hover:text-indigo-600 flex items-center justify-center shadow-xs transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.597 0 9 1.583 9 4.615V8z" />
                </svg>
              </button>
            </div>

            <span className="text-[12px] text-foreground/60 mb-3">
              or use your email for registration
            </span>

            {/* Error Message */}
            {registerError && (
              <div className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-left">{registerError}</span>
              </div>
            )}

            {/* Input: Full Name */}
            <div className="w-full relative mb-2.5">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/45 pointer-events-none" />
              <input
                type="text"
                required
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Full Name"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-white/50 border border-white/70 focus:outline-none focus:border-indigo-500 focus:bg-white/80 text-foreground placeholder:text-foreground/45 shadow-xs transition-all"
              />
            </div>

            {/* Input: Email */}
            <div className="w-full relative mb-2.5">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/45 pointer-events-none" />
              <input
                type="email"
                required
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-white/50 border border-white/70 focus:outline-none focus:border-indigo-500 focus:bg-white/80 text-foreground placeholder:text-foreground/45 shadow-xs transition-all"
              />
            </div>

            {/* Input: Password */}
            <div className="w-full relative mb-3">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/45 pointer-events-none" />
              <input
                type="password"
                required
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="Password (min 8 chars)"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-white/50 border border-white/70 focus:outline-none focus:border-indigo-500 focus:bg-white/80 text-foreground placeholder:text-foreground/45 shadow-xs transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={registerLoading}
              className="w-full py-3 px-8 rounded-2xl font-semibold text-xs sm:text-sm text-white uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
            >
              <span>{registerLoading ? "Creating..." : "Sign Up"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Mobile Switch Link */}
            <div className="mobile-switch mt-4 text-xs text-foreground/70">
              <p>Already have an account?</p>
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="mt-2 px-5 py-2 rounded-xl border border-indigo-600/40 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors"
              >
                Sign In
              </button>
            </div>
          </form>
        </div>

        {/* =========================================================
            2. SIGN IN FORM (Left box default, slides right behind)
            ========================================================= */}
        <div className="auth-form-box login-form-box">
          <form
            onSubmit={handleLoginSubmit}
            className="w-full h-full flex flex-col items-center justify-center px-6 sm:px-12 py-8 text-center"
          >
            {/* Top Logo Badge */}
            <div className="w-11 h-11 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Sign In
            </h1>

            {/* Social Links */}
            <div className="flex items-center justify-center gap-3 my-3">
              {/* Google */}
              <button
                type="button"
                aria-label="Google Sign In"
                className="w-10 h-10 rounded-full bg-white/70 hover:bg-white border border-black/5 hover:border-indigo-400 text-foreground/80 hover:text-indigo-600 flex items-center justify-center shadow-xs transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.8h6.887C18.2 16.16 15.64 18.5 12.24 18.5c-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5c1.63 0 3.12.6 4.27 1.59l2.7-2.7C17.58 2.87 15.09 2 12.24 2 6.7 2 2.2 6.5 2.2 12s4.5 10 10.04 10c9.24 0 10.32-8.6 9.6-11.715H12.24z" />
                </svg>
              </button>

              {/* LinkedIn */}
              <button
                type="button"
                aria-label="LinkedIn Sign In"
                className="w-10 h-10 rounded-full bg-white/70 hover:bg-white border border-black/5 hover:border-indigo-400 text-foreground/80 hover:text-indigo-600 flex items-center justify-center shadow-xs transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </button>

              {/* Facebook */}
              <button
                type="button"
                aria-label="Facebook Sign In"
                className="w-10 h-10 rounded-full bg-white/70 hover:bg-white border border-black/5 hover:border-indigo-400 text-foreground/80 hover:text-indigo-600 flex items-center justify-center shadow-xs transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.597 0 9 1.583 9 4.615V8z" />
                </svg>
              </button>
            </div>

            <span className="text-[12px] text-foreground/60 mb-3">
              or use your email account
            </span>

            {/* Error Message */}
            {loginError && (
              <div className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-left">{loginError}</span>
              </div>
            )}

            {/* Input: Email */}
            <div className="w-full relative mb-2.5">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/45 pointer-events-none" />
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-white/50 border border-white/70 focus:outline-none focus:border-indigo-500 focus:bg-white/80 text-foreground placeholder:text-foreground/45 shadow-xs transition-all"
              />
            </div>

            {/* Input: Password */}
            <div className="w-full relative mb-2">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/45 pointer-events-none" />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-white/50 border border-white/70 focus:outline-none focus:border-indigo-500 focus:bg-white/80 text-foreground placeholder:text-foreground/45 shadow-xs transition-all"
              />
            </div>

            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors my-2"
            >
              Forgot your password?
            </a>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-8 rounded-2xl font-semibold text-xs sm:text-sm text-white uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
            >
              <span>{loginLoading ? "Authenticating..." : "Sign In"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Mobile Switch Link */}
            <div className="mobile-switch mt-4 text-xs text-foreground/70">
              <p>Don&apos;t have an account?</p>
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="mt-2 px-5 py-2 rounded-xl border border-indigo-600/40 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors"
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>

        {/* =========================================================
            3. SLIDING GLASS PANEL OVERLAY (Slides horizontally)
            ========================================================= */}
        <div className="slide-panel-wrapper">
          <div className="slide-panel">
            {/* Left Content (Displayed when panel is on the left / Sign Up active) */}
            <div className="panel-content panel-content-left">
              <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center bg-white/20 text-white shadow-inner backdrop-blur-md border border-white/30">
                <Sparkles className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-bold text-white drop-shadow-sm mb-2">
                Welcome Back!
              </h1>
              <p className="text-sm font-light text-white/90 leading-relaxed max-w-[280px] mb-6">
                Stay connected by logging in with your credentials and continue your AI experience.
              </p>
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="px-8 py-3 rounded-2xl border-2 border-white text-white font-semibold text-xs sm:text-sm uppercase tracking-wider bg-white/10 hover:bg-white/20 backdrop-blur-md shadow-md transition-all duration-300 hover:scale-105 active:scale-95"
              >
                Sign In
              </button>
            </div>

            {/* Right Content (Displayed when panel is on the right / Sign In active) */}
            <div className="panel-content panel-content-right">
              <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center bg-white/20 text-white shadow-inner backdrop-blur-md border border-white/30">
                <Sparkles className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-bold text-white drop-shadow-sm mb-2">
                Hey There!
              </h1>
              <p className="text-sm font-light text-white/90 leading-relaxed max-w-[280px] mb-6">
                Begin your amazing journey by creating an account with MasterChat today.
              </p>
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="px-8 py-3 rounded-2xl border-2 border-white text-white font-semibold text-xs sm:text-sm uppercase tracking-wider bg-white/10 hover:bg-white/20 backdrop-blur-md shadow-md transition-all duration-300 hover:scale-105 active:scale-95"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
