"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ApiResponse, Campaign } from "@/types";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  MessageSquare,
  Tags,
  Loader2,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription } from "@/components/ui/dashboard-card";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: campaignData } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => api.get<ApiResponse<Campaign>>(`/campaigns/${id}`),
  });

  const { data: statsData } = useQuery({
    queryKey: ["campaign-stats", id],
    queryFn: () => api.get<ApiResponse<any>>(`/campaigns/${id}/stats`),
    refetchInterval: 5000,
  });

  const campaign = campaignData?.data;
  const stats = statsData?.data;

  if (!campaign) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400">Cargando campana...</p>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-600 border-emerald-200",
    paused: "bg-amber-50 text-amber-600 border-amber-200",
    completed: "bg-blue-50 text-blue-600 border-blue-200",
    failed: "bg-red-50 text-red-600 border-red-200",
    draft: "bg-slate-50 text-slate-500 border-slate-200",
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/campaigns"
          className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <DashboardHeader
          title={campaign.name}
          description={campaign.description || "Sin descripcion"}
        >
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[campaign.status] || "bg-slate-50 text-slate-500"}`}>
            {campaign.status}
          </span>
        </DashboardHeader>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <DashboardCard variant="metric" className="text-center">
            <Users className="h-5 w-5 text-slate-400 mx-auto mb-1" />
            <p className="font-display text-2xl font-bold text-slate-900">{stats.totalContacts}</p>
            <p className="text-xs text-slate-400">Total</p>
          </DashboardCard>
          <DashboardCard variant="metric" className="text-center">
            <Send className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="font-display text-2xl font-bold text-emerald-600">{stats.sent}</p>
            <p className="text-xs text-emerald-500">Enviados</p>
          </DashboardCard>
          <DashboardCard variant="metric" className="text-center">
            <CheckCircle2 className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="font-display text-2xl font-bold text-blue-600">{stats.delivered}</p>
            <p className="text-xs text-blue-500">Entregados</p>
          </DashboardCard>
          <DashboardCard variant="metric" className="text-center">
            <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="font-display text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-red-500">Fallidos</p>
          </DashboardCard>
          <DashboardCard variant="metric" className="text-center">
            <Clock className="h-5 w-5 text-slate-400 mx-auto mb-1" />
            <p className="font-display text-2xl font-bold text-slate-900">{stats.progress}%</p>
            <p className="text-xs text-slate-400">Progreso</p>
          </DashboardCard>
        </div>
      )}

      {/* Message */}
      <DashboardCard>
        <DashboardCardHeader>
          <DashboardCardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensaje
          </DashboardCardTitle>
        </DashboardCardHeader>
        <div className="rounded-2xl bg-slate-50 p-4 whitespace-pre-wrap text-sm text-slate-700">
          {campaign.message}
        </div>
      </DashboardCard>

      {/* Target tags */}
      {campaign.targetTags && campaign.targetTags.length > 0 && (
        <DashboardCard>
          <DashboardCardHeader>
            <DashboardCardTitle className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Tags de destino
            </DashboardCardTitle>
          </DashboardCardHeader>
          <div className="flex gap-2 flex-wrap">
            {campaign.targetTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </DashboardCard>
      )}
    </div>
  );
}
