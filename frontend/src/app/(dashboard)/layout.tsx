"use client";

import { TopNav } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <TopNav />
        <main className="flex-1">
          <div className="p-3 md:p-5 md:pt-4">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
