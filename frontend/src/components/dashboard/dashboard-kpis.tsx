"use client";

import type { LucideIcon } from "lucide-react";
import { DashboardCard, DashboardCardIcon } from "@/components/ui/dashboard-card";

interface KPIItem {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}

interface DashboardKPIsProps {
  items: KPIItem[];
  columns?: 2 | 3 | 4;
}

export function DashboardKPIs({ items, columns = 3 }: DashboardKPIsProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {items.map((item) => (
        <DashboardCard key={item.label} variant="metric">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {item.label}
            </span>
            <p className="font-display text-2xl font-extrabold text-slate-900 mt-1">
              {item.value}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {item.sub}
            </p>
          </div>
          <DashboardCardIcon
            className={item.iconBg ? `!bg-${item.iconBg}` : undefined}
          >
            <item.icon
              className={`w-5 h-5 ${item.iconColor || "text-emerald-600"}`}
              strokeWidth={2}
            />
          </DashboardCardIcon>
        </DashboardCard>
      ))}
    </div>
  );
}
