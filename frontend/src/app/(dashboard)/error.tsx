"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { DashboardCard } from "@/components/ui/dashboard-card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <DashboardCard className="max-w-md w-full text-center">
        <div className="py-4 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            Esta sección tuvo un problema
          </h2>
          <p className="text-sm text-slate-500">
            No pudimos cargar esta pantalla. Puedes intentar de nuevo o volver al
            inicio.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => reset()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-all"
            >
              Reintentar
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
