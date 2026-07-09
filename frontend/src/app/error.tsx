"use client";

import { useEffect } from "react";

export default function Error({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Algo salió mal</h1>
      <p className="max-w-md text-sm text-slate-500">
        Ocurrió un error inesperado. Intenta recargar la página; si el problema
        continúa, contacta a soporte.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-all"
      >
        Reintentar
      </button>
    </div>
  );
}
