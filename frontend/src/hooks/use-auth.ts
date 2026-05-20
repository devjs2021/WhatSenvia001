"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import type { User, ApiResponse } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; company?: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  isAdmin: () => boolean;
  hasFeature: (feature: string) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<ApiResponse<{ user: User; token: string; refreshToken: string }>>("/auth/login", {
        email,
        password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("refreshToken", res.data.refreshToken);
      set({ user: res.data.user, token: res.data.token });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post<ApiResponse<{ user: User; token: string; refreshToken: string }>>("/auth/register", data);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("refreshToken", res.data.refreshToken);
      set({ user: res.data.user, token: res.data.token });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    set({ user: null, token: null });
    window.location.href = "/auth/login";
  },

  loadUser: async () => {
    try {
      const res = await api.get<ApiResponse<User>>("/auth/profile");
      set({ user: res.data });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      set({ user: null, token: null });
    }
  },

  isAdmin: () => {
    return get().user?.role === "admin";
  },

  hasFeature: (feature: string) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === "admin") return true;
    const features = user.license?.features;
    if (!features) return false;
    return (features as any)[feature] === true;
  },
}));
