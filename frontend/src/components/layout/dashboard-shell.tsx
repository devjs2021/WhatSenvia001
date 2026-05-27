"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { MobileSidebar } from "./mobile-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { X, Clock, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const { user } = useAuth();

  const isDemo = user?.license?.plan === "demo";
  const isExpired = user?.license?.expiresAt
    ? new Date(user.license.expiresAt) < new Date()
    : false;

  // Check if user dismissed the banner
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("demo_banner_dismissed");
      if (dismissed === "true") {
        setShowDemoBanner(false);
      }
    }
  }, []);

  function dismissBanner() {
    setShowDemoBanner(false);
    localStorage.setItem("demo_banner_dismissed", "true");
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar desktop - fijo */}
      <DashboardSidebar />

      {/* Mobile sidebar overlay */}
      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Área principal - scroll solo aquí */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar - fijo */}
        <DashboardTopbar
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Demo activation banner */}
        {isDemo && showDemoBanner && (
          <div className={`px-6 md:px-10 py-3 ${isExpired ? "bg-red-50 border-b border-red-200" : "bg-amber-50 border-b border-amber-200"}`}>
            <div className="max-w-6xl mx-auto flex items-start gap-3">
              <div className={`mt-0.5 ${isExpired ? "text-red-500" : "text-amber-500"}`}>
                {isExpired ? (
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
                ) : (
                  <Clock className="h-5 w-5" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isExpired ? "text-red-800" : "text-amber-800"}`}>
                  {isExpired
                    ? "Tu período DEMO ha expirado"
                    : "Cuenta en período DEMO"}
                </p>
                <p className={`text-xs mt-0.5 ${isExpired ? "text-red-600" : "text-amber-700"}`}>
                  {isExpired
                    ? "Algunas funciones pueden estar limitadas. Contacta al administrador para activar tu cuenta."
                    : `Tu período de prueba vence el ${user?.license?.expiresAt ? new Date(user.license.expiresAt).toLocaleDateString() : "pronto"}. Contacta al administrador para activar tu cuenta.`}
                </p>
              </div>
              <button
                onClick={dismissBanner}
                className={`p-1 rounded-lg hover:bg-white/50 transition-colors ${isExpired ? "text-red-400 hover:text-red-600" : "text-amber-400 hover:text-amber-600"}`}
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:p-6 md:p-10 max-w-6xl w-full mx-auto space-y-6 md:space-y-8 2xl:max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
