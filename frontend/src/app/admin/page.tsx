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
      // Refresh current detail modal if open
      if (selectedUserDetail && selectedUserDetail.user.id === userId) {
        setSelectedUserDetail({
          ...selectedUserDetail,
          user: { ...selectedUserDetail.user, role: nextRole },
        });
      }
      // Refresh tables
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
          <span className="text-sm font-medium text-foreground/70">Authenticating Admin Access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 md:p-8 space-y-6">
      {/* Top Header Navigation */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-foreground/70 hover:text-foreground transition-colors border border-black/5 dark:border-white/10"
            title="Return to Chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">MasterChat Admin Suite</h1>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/20">
                <ShieldCheck className="w-3 h-3" />
                <span>Executive Telemetry</span>
              </span>
            </div>
            <p className="text-xs text-foreground/60 mt-0.5">
              Platform-wide financial audit, token volume, model distribution & user-level analytics
            </p>
          </div>
        </div>

        {/* Global Action & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Filter Pills */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-black/5 dark:border-white/10 text-xs">
            <button
              onClick={() => setTimeframeDays(1)}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all font-medium",
                timeframeDays === 1 ? "bg-white dark:bg-white/20 shadow-sm text-foreground" : "text-foreground/60 hover:text-foreground"
              )}
            >
              24h
            </button>
            <button
              onClick={() => setTimeframeDays(7)}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all font-medium",
                timeframeDays === 7 ? "bg-white dark:bg-white/20 shadow-sm text-foreground" : "text-foreground/60 hover:text-foreground"
              )}
            >
              7d
            </button>
            <button
              onClick={() => setTimeframeDays(30)}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all font-medium",
                timeframeDays === 30 ? "bg-white dark:bg-white/20 shadow-sm text-foreground" : "text-foreground/60 hover:text-foreground"
              )}
            >
              30d
            </button>
            <button
              onClick={() => setTimeframeDays(undefined)}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all font-medium",
                timeframeDays === undefined ? "bg-white dark:bg-white/20 shadow-sm text-foreground" : "text-foreground/60 hover:text-foreground"
              )}
            >
              All Time
            </button>
          </div>

          {/* Theme Palette Button */}
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-1.5"
            title="Choose Theme (10 Liquid Glass Themes)"
          >
            <Palette className="w-3.5 h-3.5 text-purple-500" />
            <span>Themes</span>
          </GlassButton>

          {/* Refresh Button */}
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => {
              loadOverview();
              loadUsers();
            }}
            disabled={isLoadingOverview || isLoadingUsers}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isLoadingOverview || isLoadingUsers) && "animate-spin")} />
            <span>Refresh</span>
          </GlassButton>
        </div>
      </header>

      {/* User Privacy Guarantee Alert */}
      <GlassCard
        variant="surface"
        className="p-3.5 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl flex items-start gap-3"
      >
        <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-xs leading-relaxed text-foreground/80">
          <strong className="text-emerald-700 dark:text-emerald-300 font-semibold">Strict Privacy Shield Active:</strong>{" "}
          Administrators can monitor aggregate financial expenses, model token distributions, and user-level consumption statistics.
          <span className="font-semibold text-foreground"> In accordance with privacy policy, users&apos; private chat messages, conversation contents, and document texts are strictly isolated and non-accessible to administrators.</span>
        </div>
      </GlassCard>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-800 dark:text-purple-300">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Estimated Dollar Cost */}
        <GlassCard variant="surface" className="p-4 rounded-3xl relative overflow-hidden border border-black/5 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Total Platform Spend</span>
            <div className="w-8 h-8 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
              ${overview ? overview.total_cost.toFixed(4) : "0.0000"}
            </div>
            <div className="text-[11px] text-foreground/50 mt-1 flex items-center gap-1">
              <span>Avg per query:</span>
              <span className="font-mono font-medium text-foreground/70">
                ${overview && overview.total_requests > 0 ? (overview.total_cost / overview.total_requests).toFixed(4) : "0.0000"}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* KPI 2: Total Tokens Processed */}
        <GlassCard variant="surface" className="p-4 rounded-3xl relative overflow-hidden border border-black/5 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Tokens Processed</span>
            <div className="w-8 h-8 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-600">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight font-mono">
              {overview ? overview.total_tokens.toLocaleString() : "0"}
            </div>
            <div className="text-[11px] text-foreground/50 mt-1 flex items-center gap-1.5 font-mono">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">{overview ? overview.prompt_tokens.toLocaleString() : "0"} prompt</span>
              <span>/</span>
              <span className="text-purple-600 dark:text-purple-400 font-medium">{overview ? overview.completion_tokens.toLocaleString() : "0"} compl</span>
            </div>
          </div>
        </GlassCard>

        {/* KPI 3: Total API Invocations */}
        <GlassCard variant="surface" className="p-4 rounded-3xl relative overflow-hidden border border-black/5 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Total Invocations</span>
            <div className="w-8 h-8 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight font-mono">
              {overview ? overview.total_requests.toLocaleString() : "0"}
            </div>
            <div className="text-[11px] text-foreground/50 mt-1 flex items-center gap-1">
              <span>Models active:</span>
              <span className="font-semibold text-foreground/80">{overview ? overview.model_breakdown.length : 0} models</span>
            </div>
          </div>
        </GlassCard>

        {/* KPI 4: User Accounts & Engagement */}
        <GlassCard variant="surface" className="p-4 rounded-3xl relative overflow-hidden border border-black/5 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Platform Accounts</span>
            <div className="w-8 h-8 rounded-2xl bg-purple-500/15 flex items-center justify-center text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight font-mono">
              {overview ? overview.total_users.toLocaleString() : "0"}
            </div>
            <div className="text-[11px] text-foreground/50 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{overview ? overview.active_users_30d : 0} active (30d)</span>
              <span>•</span>
              <span>{overview ? overview.total_documents : 0} docs</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Model Distribution & Daily Telemetry Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Breakdown (2 Cols) */}
        <GlassCard variant="surface" className="p-5 rounded-3xl border border-black/5 dark:border-white/10 lg:col-span-2 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
            <div>
              <h2 className="text-sm font-bold tracking-tight">AI Model Expense & Token Distribution</h2>
              <p className="text-[11px] text-foreground/50">Volume breakdown by underlying LLM inference provider</p>
            </div>
            <span className="text-xs font-mono font-medium text-foreground/60">
              {overview ? overview.model_breakdown.length : 0} Models Active
            </span>
          </div>

          <div className="mt-4 space-y-3.5">
            {overview && overview.model_breakdown.length > 0 ? (
              overview.model_breakdown.map((m) => {
                const isAnthropic = m.model.includes("claude");
                const isDebate = m.model.toLowerCase().includes("debate");
                return (
                  <div key={m.model} className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-foreground/90">{m.model}</span>
                        <span
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-md font-medium",
                            isDebate
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              : isAnthropic
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          )}
                        >
                          {isDebate ? "Council" : isAnthropic ? "Anthropic" : "OpenAI"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-foreground/60">{m.requests} calls</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">${m.estimated_cost.toFixed(4)}</span>
                        <span className="text-[10px] text-foreground/45">({m.cost_percentage || 0}%)</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isDebate ? "bg-purple-500" : isAnthropic ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.max(m.cost_percentage || 0, 3)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-foreground/50 font-mono">
                      <span>Tokens: {m.total_tokens.toLocaleString()} ({m.prompt_tokens.toLocaleString()} prompt / {m.completion_tokens.toLocaleString()} compl)</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-foreground/40">No model usage recorded for this timeframe.</div>
            )}
          </div>
        </GlassCard>

        {/* Daily Velocity & Trends (1 Col) */}
        <GlassCard variant="surface" className="p-5 rounded-3xl border border-black/5 dark:border-white/10 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
            <div>
              <h2 className="text-sm font-bold tracking-tight">Daily Volume & Velocity</h2>
              <p className="text-[11px] text-foreground/50">Recent daily platform throughput</p>
            </div>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>

          <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1 max-h-[340px]">
            {overview && overview.daily_trends.length > 0 ? (
              overview.daily_trends.map((t) => (
                <div key={t.date} className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs">
                  <div>
                    <span className="font-medium text-foreground/80">{t.date}</span>
                    <div className="text-[10px] text-foreground/50">{t.requests} requests • {t.tokens.toLocaleString()} tokens</div>
                  </div>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    ${t.cost.toFixed(4)}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-foreground/40">No daily telemetry records found.</div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* User-Level Detailed Analytics Table */}
      <GlassCard variant="surface" className="p-5 rounded-3xl border border-black/5 dark:border-white/10 shadow-lg space-y-4">
        {/* Table Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
          <div>
            <h2 className="text-sm font-bold tracking-tight">User Account Analytics & Consumption Audit</h2>
            <p className="text-[11px] text-foreground/50">
              Aggregated per-user financial spend and token throughput. Conversations and messages remain encrypted.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email or name..."
                className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white/40 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:border-purple-500/50 text-foreground placeholder:text-foreground/40 w-48 sm:w-60"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl text-xs bg-white/40 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none text-foreground"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins Only</option>
              <option value="user">Standard Users</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl text-xs bg-white/40 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none text-foreground"
            >
              <option value="cost">Highest Spend ($)</option>
              <option value="tokens">Most Tokens</option>
              <option value="requests">Most Invocations</option>
              <option value="recent">Recently Active</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 text-[11px] text-foreground/50 uppercase tracking-wider font-semibold">
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
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {usersData && usersData.users.length > 0 ? (
                usersData.users.map((u) => {
                  const isAdmin = u.role === "admin";
                  return (
                    <tr key={u.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      {/* User Account */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                            {u.email.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground/90">{u.full_name || "MasterChat User"}</div>
                            <div className="text-[11px] text-foreground/50 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                            isAdmin
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
                              : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                          )}
                        >
                          {isAdmin ? <ShieldCheck className="w-2.5 h-2.5" /> : null}
                          <span>{u.role.toUpperCase()}</span>
                        </span>
                      </td>

                      {/* Invocations */}
                      <td className="py-3 px-3 font-mono font-medium">{u.total_requests.toLocaleString()}</td>

                      {/* Tokens */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-semibold">{u.total_tokens.toLocaleString()}</div>
                        <div className="text-[10px] text-foreground/45 font-mono">
                          {u.prompt_tokens.toLocaleString()}p / {u.completion_tokens.toLocaleString()}c
                        </div>
                      </td>

                      {/* Estimated Cost */}
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${u.total_estimated_cost.toFixed(4)}
                      </td>

                      {/* Top Model */}
                      <td className="py-3 px-3 font-mono text-[11px] text-foreground/70">
                        {u.top_model || "—"}
                      </td>

                      {/* Activity Counts (Count only, NO private messages) */}
                      <td className="py-3 px-3 text-foreground/60">
                        <span className="font-medium text-foreground/80">{u.total_conversations}</span> chats •{" "}
                        <span className="font-medium text-foreground/80">{u.total_documents}</span> docs
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <GlassButton
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenUserDetail(u.id)}
                          className="text-[11px] py-1 px-2.5"
                        >
                          Inspect Usage
                        </GlassButton>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-foreground/40">
                    {isLoadingUsers ? "Loading user telemetry..." : "No user accounts match current search/filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* User Detail & Audit Modal */}
      <GlassModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="User Telemetry & Usage Audit"
        maxWidth="max-w-2xl"
      >
        {isLoadingDetail || !selectedUserDetail ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
            <span className="text-xs text-foreground/60">Retrieving user telemetry audit...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Profile Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm uppercase">
                  {selectedUserDetail.user.email.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">{selectedUserDetail.user.full_name || "MasterChat User"}</div>
                  <div className="text-xs text-foreground/60 font-mono">{selectedUserDetail.user.email}</div>
                  <div className="text-[10px] text-foreground/40 font-mono mt-0.5">ID: {selectedUserDetail.user.id}</div>
                </div>
              </div>

              {/* Role Toggle Button */}
              <button
                onClick={() => handleToggleRole(selectedUserDetail.user.id, selectedUserDetail.user.role)}
                disabled={roleUpdatingId === selectedUserDetail.user.id}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                  selectedUserDetail.user.role === "admin"
                    ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-rose-500/15 hover:text-rose-700"
                    : "bg-black/5 dark:bg-white/10 text-foreground/80 hover:bg-purple-500/15 hover:text-purple-700 border-black/10 dark:border-white/10"
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
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Shield:</strong> User conversations, message contents, and ingested document text are strictly confidential and excluded from administrator inspection.
              </span>
            </div>

            {/* Usage Summary Metric Badges */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="text-[10px] text-foreground/50 uppercase font-semibold">Total Spend</div>
                <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ${selectedUserDetail.user.total_estimated_cost.toFixed(4)}
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="text-[10px] text-foreground/50 uppercase font-semibold">Total Tokens</div>
                <div className="text-base font-bold font-mono mt-0.5">
                  {selectedUserDetail.user.total_tokens.toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="text-[10px] text-foreground/50 uppercase font-semibold">Invocations</div>
                <div className="text-base font-bold font-mono mt-0.5">
                  {selectedUserDetail.user.total_requests.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Per-Model Breakdown */}
            <div>
              <h3 className="text-xs font-bold uppercase text-foreground/60 tracking-wider mb-2">Model Consumption</h3>
              <div className="space-y-1.5">
                {selectedUserDetail.model_breakdown.map((mb) => (
                  <div key={mb.model} className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-mono">
                    <span className="font-semibold text-foreground/80">{mb.model}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-foreground/50">{mb.requests} calls ({mb.total_tokens.toLocaleString()} tokens)</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">${mb.estimated_cost.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent API Invocations Log (Excludes message texts) */}
            <div>
              <h3 className="text-xs font-bold uppercase text-foreground/60 tracking-wider mb-2">Recent API Invocations</h3>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {selectedUserDetail.recent_logs.length > 0 ? (
                  selectedUserDetail.recent_logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5 text-[11px] font-mono">
                      <div>
                        <span className="font-semibold text-foreground/80">{log.model}</span>
                        <span className="text-foreground/40 ml-2">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground/50">{log.total_tokens.toLocaleString()} tok</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">${log.estimated_cost.toFixed(4)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-foreground/40">No usage logs available.</div>
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
  );
}
