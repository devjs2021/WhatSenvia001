"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CardVariant = "default" | "metric" | "table" | "glass";

interface DashboardCardProps {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
  padding?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-white border border-slate-100 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.01)]",
  metric:
    "bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex justify-between items-center",
  table:
    "bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)]",
  glass:
    "bg-white/80 backdrop-blur-sm border border-slate-100 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.01)]",
};

const paddingStyles = {
  sm: "p-3",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
};

export function DashboardCard({
  children,
  variant = "default",
  className,
  padding = "md",
  onClick,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        variantStyles[variant],
        variant !== "metric" && variant !== "table" && paddingStyles[padding],
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {children}
    </div>
  );
}

// Subcomponentes para composición rápida
export function DashboardCardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between items-start mb-4", className)}>
      {children}
    </div>
  );
}

export function DashboardCardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "font-display text-base font-bold text-slate-900",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function DashboardCardDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-xs text-slate-400 mt-1", className)}>{children}</p>
  );
}

export function DashboardCardIcon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600",
        className
      )}
    >
      {children}
    </div>
  );
}
