"use client";

import { TopNav } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-emerald-950/10">
        <TopNav />
        <main className="flex-1 relative">
          {/* Decorative circles */}
          <div className="fixed top-[-120px] left-[-120px] h-80 w-80 rounded-full bg-emerald-100/30 dark:bg-emerald-900/10 pointer-events-none" />
          <div className="fixed bottom-[-80px] right-[-80px] h-60 w-60 rounded-full bg-emerald-100/20 dark:bg-emerald-900/5 pointer-events-none" />
          <div className="fixed top-1/3 right-10 h-32 w-32 rounded-full bg-emerald-100/20 dark:bg-emerald-900/10 pointer-events-none" />
          <div className="p-3 md:p-5 md:pt-4">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
