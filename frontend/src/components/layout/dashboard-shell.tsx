"use client";

import { useState } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { MobileSidebar } from "./mobile-sidebar";
import type { ReactNode } from "react";

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar desktop */}
      <DashboardSidebar />

      {/* Mobile sidebar overlay */}
      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Área principal */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <DashboardTopbar
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Contenido */}
        <div className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto space-y-8 2xl:max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
