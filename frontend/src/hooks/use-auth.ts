"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import type { User, ApiResponse } from "@/types";
import { getStoredItem, setStoredItem, removeStoredItem } from "@/lib/safe-storage";

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
  token: getStoredItem("token"),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<ApiResponse<{ user: User; token: string; refreshToken: string }>>("/auth/login", {
        email,
        password,
      });
      setStoredItem("token", res.data.token);
      setStoredItem("refreshToken", res.data.refreshToken);
      set({ user: res.data.user, token: res.data.token });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post<ApiResponse<{ user: User; token: string; refreshToken: string }>>("/auth/register", data);
      setStoredItem("token", res.data.token);
      setStoredItem("refreshToken", res.data.refreshToken);
      set({ user: res.data.user, token: res.data.token });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const refreshToken = getStoredItem("refreshToken");
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch {
      // Ignore logout errors
    }
    removeStoredItem("token");
    removeStoredItem("refreshToken");
    set({ user: null, token: null });
    window.location.href = "/auth/login";
  },

  loadUser: async () => {
    try {
      const res = await api.get<ApiResponse<User>>("/auth/profile");
      set({ user: res.data });
    } catch {
      removeStoredItem("token");
      removeStoredItem("refreshToken");
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
