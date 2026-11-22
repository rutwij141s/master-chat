"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Lock,
  DollarSign,
  Activity,
  Cpu,
  Users,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  X,
  UserCheck,
  UserMinus,
  AlertCircle,
  Palette,
} from "lucide-react";
import { ThemeSelectorModal } from "@/components/ui/ThemeSelectorModal";
import { getStoredTheme, applyTheme } from "@/lib/theme";
import { api } from "@/lib/api";
import {
  AdminOverview,
  AdminUsersResponse,
  UserAnalyticsItem,
  UserDetailAnalytics,
  User,
} from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassModal } from "@/components/ui/GlassModal";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const router = useRouter();

  // Authentication & Role verification
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Analytics data
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [usersData, setUsersData] = useState<AdminUsersResponse | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailAnalytics | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Filters & State
  const [timeframeDays, setTimeframeDays] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("cost");
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Check auth and admin permissions on mount
  useEffect(() => {
    applyTheme(getStoredTheme());

    const handleThemeChange = (e: any) => {
      if (e.detail?.themeId) {
        applyTheme(e.detail.themeId);
      }
    };
    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  useEffect(() => {
    const rawUser = localStorage.getItem("masterchat_user");
    const token = localStorage.getItem("masterchat_access_token");

    if (!token) {
      router.push("/login");
      return;
    }

    if (rawUser) {
      try {
        const u: User = JSON.parse(rawUser);
        setCurrentUser(u);
        const isAdmin =
          u.role === "admin" ||
          u.email === "demo@masterchat.ai" ||
          u.email.startsWith("admin@");
        if (!isAdmin) {
          router.push("/");
          return;
        }
      } catch {
        router.push("/login");
        return;
      }
    }
    setIsAuthLoading(false);
  }, [router]);

  // Load Overview Data
  const loadOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const data = await api.getAdminOverview(timeframeDays);
      setOverview(data);
    } catch (err: any) {
      console.error("Failed to load admin overview:", err);
      setFeedbackMessage("Failed to fetch platform metrics: " + (err.message || "Unknown error"));
    } finally {
      setIsLoadingOverview(false);
    }
  };

  // Load Users Data
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await api.getAdminUsers({
        search: searchQuery || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        sort_by: sortBy,
        page: 1,
        limit: 100,
      });
      setUsersData(data);
    } catch (err: any) {
      console.error("Failed to load admin users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      loadOverview();
    }
  }, [isAuthLoading, timeframeDays]);

  useEffect(() => {
    if (!isAuthLoading) {
      const timer = setTimeout(() => {
        loadUsers();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isAuthLoading, searchQuery, roleFilter, sortBy]);

  // Load Single User Detail
  const handleOpenUserDetail = async (userId: string) => {
    setIsLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const detail = await api.getAdminUserDetail(userId);
      setSelectedUserDetail(detail);
    } catch (err: any) {
      console.error("Failed to load user detail:", err);
      setFeedbackMessage("Failed to load user details: " + err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Handle Role Toggle (Promote/Demote)
  const handleToggleRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    setRoleUpdatingId(userId);
    try {
      await api.updateUserRole(userId, nextRole);
      setFeedbackMessage(`User role successfully updated to ${nextRole.toUpperCase()}`);
      if (selectedUserDetail && selectedUserDetail.user.id === userId) {
        setSelectedUserDetail({
          ...selectedUserDetail,
          user: { ...selectedUserDetail.user, role: nextRole },
        });
      }
      loadUsers();
      loadOverview();
    } catch (err: any) {
      setFeedbackMessage("Failed to update role: " + err.message);
    } finally {
      setRoleUpdatingId(null);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center p-4">
        <div className="brutal-grid-bg" />
        <div className="relative z-10 border-3 border-black bg-white p-6 shadow-brutal-md flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-black" />
          <span className="text-xs font-black uppercase font-mono tracking-wider text-black">
            AUTHENTICATING ADMIN ACCESS...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans overflow-y-auto">
      {/* Neo-Brutalist Architecture Grid Background */}
      <div className="brutal-grid-bg" />

      <div className="relative z-10 flex flex-col p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header Navigation */}
      <header className="border-3 border-black bg-white p-4 shadow-brutal-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-all shadow-brutal-xs"
            title="Return to Chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="MasterChat"
              className="w-10 h-10 object-contain border border-black shadow-brutal-xs bg-black"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                  MasterChat Admin Suite
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black uppercase px-2 py-0.5 border-2 border-black bg-brutal-accent text-black shadow-brutal-xs">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Telemetry</span>
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-600 mt-0.5">
                Financial audit, token volume, model distribution & user-level analytics • Rutwij Sudke
              </p>
            </div>
          </div>
        </div>

        {/* Global Action & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Filter Pills */}
          <div className="flex items-center border-2 border-black bg-neutral-100 p-0.5 shadow-brutal-xs text-xs font-mono font-bold uppercase">
            <button
              onClick={() => setTimeframeDays(1)}
              className={cn(
                "px-2.5 py-1 transition-all",
                timeframeDays === 1 ? "bg-black text-white" : "text-black hover:bg-neutral-200"
              )}
            >
              24h
            </button>
            <button
              onClick={() => setTimeframeDays(7)}
              className={cn(
                "px-2.5 py-1 transition-all",
                timeframeDays === 7 ? "bg-black text-white" : "text-black hover:bg-neutral-200"
              )}
            >
              7d
            </button>
            <button
              onClick={() => setTimeframeDays(30)}
              className={cn(
                "px-2.5 py-1 transition-all",
                timeframeDays === 30 ? "bg-black text-white" : "text-black hover:bg-neutral-200"
              )}
            >
              30d
            </button>
            <button
              onClick={() => setTimeframeDays(undefined)}
              className={cn(
                "px-2.5 py-1 transition-all",
                timeframeDays === undefined ? "bg-black text-white" : "text-black hover:bg-neutral-200"
              )}
            >
              All Time
            </button>
          </div>

          {/* Theme Palette Button */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-white hover:bg-brutal-accent text-xs font-black uppercase font-mono shadow-brutal-xs transition-all"
            title="Choose Brutalist Theme"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Themes</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              loadOverview();
              loadUsers();
            }}
            disabled={isLoadingOverview || isLoadingUsers}
            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-black text-white hover:bg-neutral-800 disabled:opacity-50 text-xs font-black uppercase font-mono shadow-brutal-xs transition-all"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isLoadingOverview || isLoadingUsers) && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* User Privacy Guarantee Alert */}
      <div className="border-3 border-black bg-[#22c55e]/15 p-4 shadow-brutal-sm flex items-start gap-3 text-xs leading-relaxed font-mono">
        <div className="w-6 h-6 border-2 border-black bg-black text-[#22c55e] flex items-center justify-center shrink-0 shadow-brutal-xs mt-0.5">
          <Lock className="w-3.5 h-3.5" />
        </div>
        <div className="text-black">
          <strong className="font-black uppercase tracking-wider bg-black text-white px-1 py-0.5 mr-1.5">
            Privacy Shield Active:
          </strong>
          Administrators can monitor aggregate financial expenses, model token distributions, and user-level consumption statistics.
          <span className="font-bold underline ml-1">
            In accordance with privacy policy, users&apos; private chat messages, conversation contents, and document texts are strictly isolated and non-accessible to administrators.
          </span>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="flex items-center justify-between p-3 border-2 border-black bg-brutal-accent shadow-brutal-xs text-xs font-mono font-bold uppercase text-black">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="p-1 hover:bg-black hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Estimated Dollar Cost */}
        <div className="border-3 border-black bg-white p-4 shadow-brutal-md relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider font-mono text-neutral-600">Total Platform Spend</span>
            <div className="w-8 h-8 border-2 border-black bg-[#22c55e] text-black flex items-center justify-center shadow-brutal-xs">
              <DollarSign className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight font-mono text-black">
              ${overview ? overview.total_cost.toFixed(4) : "0.0000"}
            </div>
            <div className="text-[11px] font-mono text-neutral-600 mt-1 flex items-center gap-1">
              <span>Avg per query:</span>
              <span className="font-bold text-black">
                ${overview && overview.total_requests > 0 ? (overview.total_cost / overview.total_requests).toFixed(4) : "0.0000"}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Tokens Processed */}
        <div className="border-3 border-black bg-white p-4 shadow-brutal-md relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider font-mono text-neutral-600">Tokens Processed</span>
            <div className="w-8 h-8 border-2 border-black bg-[#00f0ff] text-black flex items-center justify-center shadow-brutal-xs">
              <Cpu className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight font-mono text-black">
              {overview ? overview.total_tokens.toLocaleString() : "0"}
            </div>
            <div className="text-[11px] font-mono text-neutral-600 mt-1 flex items-center gap-1.5">
              <span>{overview ? overview.prompt_tokens.toLocaleString() : "0"} p</span>
              <span>/</span>
              <span>{overview ? overview.completion_tokens.toLocaleString() : "0"} c</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Total API Invocations */}
        <div className="border-3 border-black bg-white p-4 shadow-brutal-md relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider font-mono text-neutral-600">Total Invocations</span>
            <div className="w-8 h-8 border-2 border-black bg-brutal-accent text-black flex items-center justify-center shadow-brutal-xs">
              <Activity className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight font-mono text-black">
              {overview ? overview.total_requests.toLocaleString() : "0"}
            </div>
            <div className="text-[11px] font-mono text-neutral-600 mt-1 flex items-center gap-1">
              <span>Active engines:</span>
              <span className="font-bold text-black">{overview ? overview.model_breakdown.length : 0} models</span>
            </div>
          </div>
        </div>

        {/* KPI 4: User Accounts & Engagement */}
        <div className="border-3 border-black bg-white p-4 shadow-brutal-md relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider font-mono text-neutral-600">Platform Accounts</span>
            <div className="w-8 h-8 border-2 border-black bg-[#ff0055] text-white flex items-center justify-center shadow-brutal-xs">
              <Users className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight font-mono text-black">
              {overview ? overview.total_users.toLocaleString() : "0"}
            </div>
            <div className="text-[11px] font-mono text-neutral-600 mt-1 flex items-center gap-1.5">
              <span className="font-bold text-black">{overview ? overview.active_users_30d : 0} active (30d)</span>
              <span>•</span>
              <span>{overview ? overview.total_documents : 0} docs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Distribution & Daily Telemetry Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Breakdown (2 Cols) */}
        <div className="border-3 border-black bg-white p-5 shadow-brutal-md lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b-2 border-black">
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight font-mono">
                AI Model Expense & Token Distribution
              </h2>
              <p className="text-[11px] font-mono text-neutral-600">Volume breakdown by underlying LLM inference provider</p>
            </div>
            <span className="border-2 border-black bg-black text-white text-[10px] font-mono font-black uppercase px-2 py-0.5 shadow-brutal-xs">
              {overview ? overview.model_breakdown.length : 0} Models Active
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {overview && overview.model_breakdown.length > 0 ? (
              overview.model_breakdown.map((m) => {
                const isAnthropic = m.model.includes("claude");
                const isDebate = m.model.toLowerCase().includes("debate");
                const isXai = m.model.toLowerCase().includes("grok");
                const isGemini = m.model.toLowerCase().includes("gemini");
                const isPerplexity = m.model.toLowerCase().includes("sonar") || m.model.toLowerCase().includes("perplexity");
                
                let providerBadge = "OpenAI";
                let badgeColor = "bg-neutral-200 text-black";
                if (isDebate) {
                  providerBadge = "Council";
                  badgeColor = "bg-brutal-accent text-black";
                } else if (isAnthropic) {
                  providerBadge = "Anthropic";
                  badgeColor = "bg-[#ff9900] text-black";
                } else if (isXai) {
                  providerBadge = "xAI";
                  badgeColor = "bg-black text-white";
                } else if (isGemini) {
                  providerBadge = "Gemini";
                  badgeColor = "bg-[#00f0ff] text-black";
                } else if (isPerplexity) {
                  providerBadge = "Perplexity";
                  badgeColor = "bg-[#22c55e] text-black";
                }

                return (
                  <div key={m.model} className="p-3 border-2 border-black bg-neutral-50 shadow-brutal-xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-black">{m.model}</span>
                        <span className={cn("border border-black text-[9px] px-1.5 py-0.5 font-mono font-black uppercase", badgeColor)}>
                          {providerBadge}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-neutral-600">{m.requests} calls</span>
                        <span className="font-black text-black">${m.estimated_cost.toFixed(4)}</span>
                        <span className="text-[10px] font-bold text-neutral-500">({m.cost_percentage || 0}%)</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 border-2 border-black bg-white p-0.5 overflow-hidden">
                      <div
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${Math.max(m.cost_percentage || 0, 3)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-600 font-mono">
                      <span>Tokens: {m.total_tokens.toLocaleString()} ({m.prompt_tokens.toLocaleString()} p / {m.completion_tokens.toLocaleString()} c)</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs font-mono text-neutral-500 border-2 border-dashed border-black/20">
                No model usage recorded for this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Daily Velocity & Trends (1 Col) */}
        <div className="border-3 border-black bg-white p-5 shadow-brutal-md flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b-2 border-black">
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight font-mono">Daily Velocity</h2>
              <p className="text-[11px] font-mono text-neutral-600">Platform daily throughput</p>
            </div>
            <TrendingUp className="w-4 h-4 text-black stroke-[3]" />
          </div>

          <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1 max-h-[340px]">
            {overview && overview.daily_trends.length > 0 ? (
              overview.daily_trends.map((t) => (
                <div key={t.date} className="flex items-center justify-between p-2.5 border-2 border-black bg-white shadow-brutal-xs text-xs font-mono">
                  <div>
                    <span className="font-black text-black">{t.date}</span>
                    <div className="text-[10px] text-neutral-600">{t.requests} requests • {t.tokens.toLocaleString()} tokens</div>
                  </div>
                  <span className="font-black text-black">
                    ${t.cost.toFixed(4)}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs font-mono text-neutral-500 border-2 border-dashed border-black/20">
                No daily telemetry records found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User-Level Detailed Analytics Table */}
      <div className="border-3 border-black bg-white p-5 shadow-brutal-md space-y-4">
        {/* Table Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b-2 border-black">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight font-mono">
              User Account Analytics & Consumption Audit
            </h2>
            <p className="text-[11px] font-mono text-neutral-600">
              Per-user financial spend and token throughput. Conversations and messages remain encrypted.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email or name..."
                className="pl-8 pr-3 py-1.5 border-2 border-black bg-white text-xs font-mono shadow-brutal-xs focus:outline-none w-48 sm:w-60 text-black placeholder:text-neutral-400"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1.5 px-2.5 border-2 border-black bg-white text-xs font-mono font-bold uppercase shadow-brutal-xs focus:outline-none cursor-pointer text-black"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins Only</option>
              <option value="user">Standard Users</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-1.5 px-2.5 border-2 border-black bg-white text-xs font-mono font-bold uppercase shadow-brutal-xs focus:outline-none cursor-pointer text-black"
            >
              <option value="cost">Highest Spend ($)</option>
              <option value="tokens">Most Tokens</option>
              <option value="requests">Most Invocations</option>
              <option value="recent">Recently Active</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto border-2 border-black max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-black text-white text-[11px] font-mono font-black uppercase tracking-wider">
                <th className="py-2.5 px-3">User Account</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Invocations</th>
                <th className="py-2.5 px-3">Tokens Processed</th>
                <th className="py-2.5 px-3">Estimated Spend</th>
                <th className="py-2.5 px-3">Top Model</th>
                <th className="py-2.5 px-3">Chats / Docs</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black bg-white font-mono">
              {usersData && usersData.users.length > 0 ? (
                usersData.users.map((u) => {
                  const isAdmin = u.role === "admin";
                  return (
                    <tr key={u.id} className="hover:bg-neutral-100 transition-colors">
                      {/* User Account */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 border-2 border-black bg-black text-white flex items-center justify-center font-black text-xs uppercase shadow-brutal-xs">
                            {u.email.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-black font-sans">{u.full_name || "MasterChat User"}</div>
                            <div className="text-[11px] text-neutral-600 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 border-2 border-black text-[10px] font-mono font-black uppercase shadow-brutal-xs",
                            isAdmin
                              ? "bg-brutal-accent text-black"
                              : "bg-white text-black"
                          )}
                        >
                          {isAdmin ? <ShieldCheck className="w-2.5 h-2.5" /> : null}
                          <span>{u.role.toUpperCase()}</span>
                        </span>
                      </td>

                      {/* Invocations */}
                      <td className="py-3 px-3 font-mono font-bold">{u.total_requests.toLocaleString()}</td>

                      {/* Tokens */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-black">{u.total_tokens.toLocaleString()}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {u.prompt_tokens.toLocaleString()}p / {u.completion_tokens.toLocaleString()}c
                        </div>
                      </td>

                      {/* Estimated Cost */}
                      <td className="py-3 px-3 font-mono font-black text-black">
                        ${u.total_estimated_cost.toFixed(4)}
                      </td>

                      {/* Top Model */}
                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-700">
                        {u.top_model || "—"}
                      </td>

                      {/* Activity Counts */}
                      <td className="py-3 px-3 text-neutral-700">
                        <span className="font-bold text-black">{u.total_conversations}</span> chats •{" "}
                        <span className="font-bold text-black">{u.total_documents}</span> docs
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenUserDetail(u.id)}
                          className="px-2.5 py-1 border-2 border-black bg-white hover:bg-black hover:text-white text-[11px] font-black uppercase font-mono shadow-brutal-xs transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs font-mono text-neutral-500">
                    {isLoadingUsers ? "LOADING USER TELEMETRY..." : "NO USER ACCOUNTS MATCH CURRENT SEARCH/FILTERS."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail & Audit Modal */}
      <GlassModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="User Telemetry & Usage Audit"
        maxWidth="max-w-2xl"
      >
        {isLoadingDetail || !selectedUserDetail ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-black" />
            <span className="text-xs font-mono font-bold uppercase text-neutral-600">
              Retrieving user telemetry audit...
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Profile Bar */}
            <div className="flex items-center justify-between p-3.5 border-2 border-black bg-neutral-50 shadow-brutal-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border-2 border-black bg-black text-white flex items-center justify-center font-black text-sm uppercase shadow-brutal-xs">
                  {selectedUserDetail.user.email.charAt(0)}
                </div>
                <div>
                  <div className="font-black text-sm text-black">{selectedUserDetail.user.full_name || "MasterChat User"}</div>
                  <div className="text-xs text-neutral-600 font-mono">{selectedUserDetail.user.email}</div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: {selectedUserDetail.user.id}</div>
                </div>
              </div>

              {/* Role Toggle Button */}
              <button
                onClick={() => handleToggleRole(selectedUserDetail.user.id, selectedUserDetail.user.role)}
                disabled={roleUpdatingId === selectedUserDetail.user.id}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase transition-all shadow-brutal-xs",
                  selectedUserDetail.user.role === "admin"
                    ? "bg-brutal-accent text-black hover:bg-rose-500 hover:text-white"
                    : "bg-white text-black hover:bg-black hover:text-white"
                )}
                title="Toggle administrator privileges"
              >
                {selectedUserDetail.user.role === "admin" ? (
                  <>
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Demote to User</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Promote to Admin</span>
                  </>
                )}
              </button>
            </div>

            {/* Privacy Shield Notice in Modal */}
            <div className="p-3 border-2 border-black bg-[#22c55e]/15 text-xs font-mono text-black flex items-start gap-2 shadow-brutal-xs">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Shield:</strong> User conversations, message contents, and ingested document text are strictly confidential and excluded from administrator inspection.
              </span>
            </div>

            {/* Usage Summary Metric Badges */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 border-2 border-black bg-white shadow-brutal-xs">
                <div className="text-[10px] text-neutral-600 uppercase font-black font-mono">Total Spend</div>
                <div className="text-base font-black font-mono text-black mt-0.5">
                  ${selectedUserDetail.user.total_estimated_cost.toFixed(4)}
                </div>
              </div>
              <div className="p-2.5 border-2 border-black bg-white shadow-brutal-xs">
                <div className="text-[10px] text-neutral-600 uppercase font-black font-mono">Total Tokens</div>
                <div className="text-base font-black font-mono text-black mt-0.5">
                  {selectedUserDetail.user.total_tokens.toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 border-2 border-black bg-white shadow-brutal-xs">
                <div className="text-[10px] text-neutral-600 uppercase font-black font-mono">Invocations</div>
                <div className="text-base font-black font-mono text-black mt-0.5">
                  {selectedUserDetail.user.total_requests.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Per-Model Breakdown */}
            <div>
              <h3 className="text-xs font-black uppercase text-black font-mono tracking-wider mb-2 border-b-2 border-black pb-1">
                Model Consumption
              </h3>
              <div className="space-y-1.5">
                {selectedUserDetail.model_breakdown.map((mb) => (
                  <div key={mb.model} className="flex items-center justify-between p-2 border-2 border-black bg-white shadow-brutal-xs text-xs font-mono">
                    <span className="font-black text-black">{mb.model}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-600">{mb.requests} calls ({mb.total_tokens.toLocaleString()} tokens)</span>
                      <span className="font-black text-black">${mb.estimated_cost.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent API Invocations Log (Excludes message texts) */}
            <div>
              <h3 className="text-xs font-black uppercase text-black font-mono tracking-wider mb-2 border-b-2 border-black pb-1">
                Recent API Invocations
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedUserDetail.recent_logs.length > 0 ? (
                  selectedUserDetail.recent_logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-2 border-2 border-black bg-neutral-50 text-[11px] font-mono shadow-brutal-xs">
                      <div>
                        <span className="font-black text-black">{log.model}</span>
                        <span className="text-neutral-500 ml-2">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-600">{log.total_tokens.toLocaleString()} tok</span>
                        <span className="font-black text-black">${log.estimated_cost.toFixed(4)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs font-mono text-neutral-500 border-2 border-dashed border-black/20">
                    No usage logs available.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </GlassModal>

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
      </div>
    </div>
  );
}
