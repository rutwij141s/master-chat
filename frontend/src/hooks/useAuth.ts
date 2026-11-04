"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import { api } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawUser = localStorage.getItem("masterchat_user");
    const token = localStorage.getItem("masterchat_access_token");
    if (rawUser && token) {
      try {
        setUser(JSON.parse(rawUser));
      } catch {
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setUser(res.user);
    return res;
  };

  const register = async (email: string, pass: string, name?: string) => {
    const res = await api.register(email, pass, name);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
  };

  return { user, isLoading, login, register, logout };
}

