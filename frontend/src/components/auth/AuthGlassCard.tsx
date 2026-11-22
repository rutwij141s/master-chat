"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, User, AlertCircle, ShieldCheck } from "lucide-react";
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
      {/* Sliding Brutalist Card Container */}
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
            className="w-full h-full flex flex-col items-center justify-center px-6 sm:px-12 py-8 text-center bg-white"
          >
            {/* Top Logo Badge */}
            <div className="mb-2 flex items-center gap-2 border-2 border-black px-2.5 py-1 bg-[#f4f4f0] shadow-[2px_2px_0px_0px_#000]">
              <img
                src="/logo.png"
                alt="MasterChat Logo"
                className="w-6 h-6 object-contain"
              />
              <span className="font-black text-xs uppercase tracking-wider text-black">
                MASTERCHAT AI
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black mt-2">
              CREATE ACCOUNT
            </h1>
            <p className="text-xs font-mono font-bold text-black/60 uppercase tracking-widest mt-1 mb-4">
              [ ENTER PROTOCOL CREDENTIALS ]
            </p>

            {/* Social Authentication */}
            <div className="flex items-center justify-center gap-2.5 mb-3 w-full max-w-[320px]">
              <button
                type="button"
                aria-label="Google Sign In"
                className="flex-1 py-2 border-2 border-black bg-white hover:bg-[#FFE600] text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.8h6.887C18.2 16.16 15.64 18.5 12.24 18.5c-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5c1.63 0 3.12.6 4.27 1.59l2.7-2.7C17.58 2.87 15.09 2 12.24 2 6.7 2 2.2 6.5 2.2 12s4.5 10 10.04 10c9.24 0 10.32-8.6 9.6-11.715H12.24z" />
                </svg>
                <span>GOOGLE</span>
              </button>
              <button
                type="button"
                aria-label="GitHub Sign In"
                className="flex-1 py-2 border-2 border-black bg-white hover:bg-[#00FF66] text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>GITHUB</span>
              </button>
            </div>

            <span className="text-[11px] font-mono font-bold uppercase text-black/50 mb-3">
              --- OR WITH EMAIL SYSTEM ---
            </span>

            {/* Error Message */}
            {registerError && (
              <div className="w-full max-w-[320px] flex items-center gap-2 p-2 border-2 border-black bg-red-100 text-red-900 text-xs font-bold mb-3 shadow-[2px_2px_0px_0px_#000]">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                <span className="text-left font-mono">{registerError}</span>
              </div>
            )}

            {/* Input: Full Name */}
            <div className="w-full max-w-[320px] relative mb-2.5">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
              <input
                type="text"
                required
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="FULL NAME"
                className="w-full pl-9 pr-3 py-2 text-xs font-bold border-2 border-black bg-white focus:bg-[#fffdf0] text-black placeholder:text-black/40 shadow-[3px_3px_0px_0px_#000] focus:shadow-[5px_5px_0px_0px_#000] focus:outline-none transition-all rounded-none"
              />
            </div>

            {/* Input: Email */}
            <div className="w-full max-w-[320px] relative mb-2.5">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
              <input
                type="email"
                required
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="EMAIL ADDRESS"
                className="w-full pl-9 pr-3 py-2 text-xs font-bold border-2 border-black bg-white focus:bg-[#fffdf0] text-black placeholder:text-black/40 shadow-[3px_3px_0px_0px_#000] focus:shadow-[5px_5px_0px_0px_#000] focus:outline-none transition-all rounded-none"
              />
            </div>

            {/* Input: Password */}
            <div className="w-full max-w-[320px] relative mb-4">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
              <input
                type="password"
                required
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="PASSWORD (MIN 8 CHARS)"
                className="w-full pl-9 pr-3 py-2 text-xs font-bold border-2 border-black bg-white focus:bg-[#fffdf0] text-black placeholder:text-black/40 shadow-[3px_3px_0px_0px_#000] focus:shadow-[5px_5px_0px_0px_#000] focus:outline-none transition-all rounded-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={registerLoading}
              className="w-full max-w-[320px] py-2.5 px-6 font-black text-xs uppercase tracking-wider text-black bg-brutal-accent hover:bg-brutal-accentHover border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_0px_#000] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 rounded-none cursor-pointer"
            >
              <span>{registerLoading ? "REGISTERING..." : "CREATE ACCOUNT"}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            {/* Mobile Switch Link */}
            <div className="mobile-switch mt-4 text-xs font-bold">
              <p className="text-black/70">ALREADY HAVE AN ACCOUNT?</p>
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="mt-2 px-4 py-1.5 border-2 border-black bg-white text-black font-black uppercase shadow-[2px_2px_0px_0px_#000]"
              >
                SWITCH TO SIGN IN
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
            className="w-full h-full flex flex-col items-center justify-center px-6 sm:px-12 py-8 text-center bg-white"
          >
            {/* Top Logo Badge */}
            <div className="mb-2 flex items-center gap-2 border-2 border-black px-2.5 py-1 bg-[#f4f4f0] shadow-[2px_2px_0px_0px_#000]">
              <img
                src="/logo.png"
                alt="MasterChat Logo"
                className="w-6 h-6 object-contain"
              />
              <span className="font-black text-xs uppercase tracking-wider text-black">
                MASTERCHAT AI
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black mt-2">
              SIGN IN
            </h1>
            <p className="text-xs font-mono font-bold text-black/60 uppercase tracking-widest mt-1 mb-4">
              [ AUTHENTICATE TERMINAL SESSION ]
            </p>

            {/* Social Authentication */}
            <div className="flex items-center justify-center gap-2.5 mb-3 w-full max-w-[320px]">
              <button
                type="button"
                aria-label="Google Sign In"
                className="flex-1 py-2 border-2 border-black bg-white hover:bg-[#FFE600] text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.8h6.887C18.2 16.16 15.64 18.5 12.24 18.5c-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5c1.63 0 3.12.6 4.27 1.59l2.7-2.7C17.58 2.87 15.09 2 12.24 2 6.7 2 2.2 6.5 2.2 12s4.5 10 10.04 10c9.24 0 10.32-8.6 9.6-11.715H12.24z" />
                </svg>
                <span>GOOGLE</span>
              </button>
              <button
                type="button"
                aria-label="GitHub Sign In"
                className="flex-1 py-2 border-2 border-black bg-white hover:bg-[#00FF66] text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] transition-all"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>GITHUB</span>
              </button>
            </div>

            <span className="text-[11px] font-mono font-bold uppercase text-black/50 mb-3">
              --- OR WITH CREDENTIALS ---
            </span>

            {/* Error Message */}
            {loginError && (
              <div className="w-full max-w-[320px] flex items-center gap-2 p-2 border-2 border-black bg-red-100 text-red-900 text-xs font-bold mb-3 shadow-[2px_2px_0px_0px_#000]">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                <span className="text-left font-mono">{loginError}</span>
              </div>
            )}

            {/* Input: Email */}
            <div className="w-full max-w-[320px] relative mb-2.5">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="EMAIL ADDRESS"
                className="w-full pl-9 pr-3 py-2 text-xs font-bold border-2 border-black bg-white focus:bg-[#fffdf0] text-black placeholder:text-black/40 shadow-[3px_3px_0px_0px_#000] focus:shadow-[5px_5px_0px_0px_#000] focus:outline-none transition-all rounded-none"
              />
            </div>

            {/* Input: Password */}
            <div className="w-full max-w-[320px] relative mb-2">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="PASSWORD"
                className="w-full pl-9 pr-3 py-2 text-xs font-bold border-2 border-black bg-white focus:bg-[#fffdf0] text-black placeholder:text-black/40 shadow-[3px_3px_0px_0px_#000] focus:shadow-[5px_5px_0px_0px_#000] focus:outline-none transition-all rounded-none"
              />
            </div>

            {/* Demo Hint */}
            <div className="w-full max-w-[320px] text-left my-1">
              <span className="text-[10px] font-mono font-bold text-black/60 bg-[#f4f4f0] px-1.5 py-0.5 border border-black inline-block">
                DEMO: demo@masterchat.ai / Password123!
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full max-w-[320px] mt-2 py-2.5 px-6 font-black text-xs uppercase tracking-wider text-black bg-brutal-accent hover:bg-brutal-accentHover border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_0px_#000] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 rounded-none cursor-pointer"
            >
              <span>{loginLoading ? "AUTHENTICATING..." : "SIGN IN"}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            {/* Mobile Switch Link */}
            <div className="mobile-switch mt-4 text-xs font-bold">
              <p className="text-black/70">NO ACCOUNT REGISTERED?</p>
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="mt-2 px-4 py-1.5 border-2 border-black bg-white text-black font-black uppercase shadow-[2px_2px_0px_0px_#000]"
              >
                SWITCH TO SIGN UP
              </button>
            </div>
          </form>
        </div>

        {/* =========================================================
            3. SLIDING BRUTALIST OVERLAY PANEL
            ========================================================= */}
        <div className="slide-panel-wrapper">
          <div className="slide-panel">
            {/* Left Content (Displayed when panel is on the left / Sign Up active) */}
            <div className="panel-content panel-content-left">
              <div className="w-16 h-16 border-3 border-black bg-white p-2.5 shadow-[4px_4px_0px_0px_#000] mb-4">
                <img
                  src="/logo.png"
                  alt="MasterChat"
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black mb-2">
                AUTHENTICATED?
              </h2>
              <p className="text-xs sm:text-sm font-bold text-black/85 leading-relaxed max-w-[280px] mb-6 uppercase">
                Return to your active terminal session and manage your model streams.
              </p>
              <button
                type="button"
                onClick={() => switchMode(false)}
                className="px-6 py-2.5 border-3 border-black bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[4px_4px_0px_0px_#000] hover:bg-neutral-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_0px_#000] transition-all rounded-none cursor-pointer"
              >
                SIGN IN NOW
              </button>
            </div>

            {/* Right Content (Displayed when panel is on the right / Sign In active) */}
            <div className="panel-content panel-content-right">
              <div className="w-16 h-16 border-3 border-black bg-white p-2.5 shadow-[4px_4px_0px_0px_#000] mb-4">
                <img
                  src="/logo.png"
                  alt="MasterChat"
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black mb-2">
                NEW OPERATOR?
              </h2>
              <p className="text-xs sm:text-sm font-bold text-black/85 leading-relaxed max-w-[280px] mb-6 uppercase">
                Initialize an account with multi-model debate, document RAG, and deep agent reasoning.
              </p>
              <button
                type="button"
                onClick={() => switchMode(true)}
                className="px-6 py-2.5 border-3 border-black bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[4px_4px_0px_0px_#000] hover:bg-neutral-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_0px_#000] transition-all rounded-none cursor-pointer"
              >
                CREATE ACCOUNT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BrutalAuthCard = AuthGlassCard;
