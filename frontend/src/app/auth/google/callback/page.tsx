"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const authError = params.get("error");

    if (authError) {
      setError(authError === "access_denied" ? "Acceso cancelado" : authError);
      return;
    }

    if (!code) {
      setError("No se recibió código de autorización");
      return;
    }

    const redirectUri = window.location.origin + "/auth/google/callback";

    api.post<{
      success: boolean;
      data: { user: any; token: string; refreshToken: string; isNewUser: boolean };
    }>("/auth/google", { code, redirectUri })
      .then((res) => {
        const { user, token, refreshToken } = res.data;
        localStorage.setItem("token", token);
        localStorage.setItem("refreshToken", refreshToken);
        useAuth.setState({ user, token });
        router.replace("/contacts");
      })
      .catch((err: any) => {
        setError(err.message || "Error al autenticar con Google");
      });
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500 text-sm">{error}</p>
        <a href="/auth/login" className="text-emerald-600 text-sm font-medium hover:underline">
          Volver al login
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen gap-2">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
      <p className="text-slate-500 text-sm">Autenticando con Google...</p>
    </div>
  );
}
