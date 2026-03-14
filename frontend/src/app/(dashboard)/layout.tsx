"use client";

import { Sidebar, MobileHeader } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen flex-col md:flex-row">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0">
          <MobileHeader />
          <main className="flex-1 overflow-auto">
            <div className="p-3 md:p-5 md:pt-4">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
