"use client";

import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription } from "@/components/ui/dashboard-card";

interface DashboardChartProps {
  title: string;
  description?: string;
}

export function DashboardChart({ title, description }: DashboardChartProps) {
  return (
    <DashboardCard>
      <DashboardCardHeader className="!mb-3">
        <div>
          <DashboardCardTitle>{title}</DashboardCardTitle>
          {description && <DashboardCardDescription>{description}</DashboardCardDescription>}
        </div>
      </DashboardCardHeader>

      <div className="w-full h-32">
        <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="50" x2="1000" y2="50" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="0" y1="100" x2="1000" y2="100" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="0" y1="150" x2="1000" y2="150" stroke="#F1F5F9" strokeWidth="1" />
          <path d="M0,200 L0,150 Q150,130 300,120 T600,60 T900,40 L1000,30 L1000,200 Z" fill="url(#chartGradient)" />
          <path d="M0,150 Q150,130 300,120 T600,60 T900,40 L1000,30" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
          <circle cx="300" cy="120" r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="600" cy="60" r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="1000" cy="30" r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-2">
        <span>Sem 1</span>
        <span>Sem 2</span>
        <span>Sem 3</span>
        <span>Actual</span>
      </div>
    </DashboardCard>
  );
}
