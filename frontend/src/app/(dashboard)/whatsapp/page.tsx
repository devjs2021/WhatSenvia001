"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { toast } from "sonner";
import {
  Plus, Plug, PlugZap, Trash2, RefreshCw,
  CheckCircle, Building2, Phone, ShieldCheck, Rocket,
} from "lucide-react";
import { MetaSignupButton } from "@/components/whatsapp/meta-signup-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription,
} from "@/components/ui/dashboard-card";

const statusStyles: Record<string, string> = {
  disconnected: "bg-slate-100 text-slate-500",
  connecting: "bg-amber-50 text-amber-600",
  connected: "bg-emerald-50 text-emerald-600",
  qr_pending: "bg-amber-50 text-amber-600",
};

const SETUP_STEPS = [
  {
    number: 1,
    icon: Rocket,
    titleKey: "whatsapp.step1Title",
    descKey: "whatsapp.step1Desc",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    number: 2,
    icon: Building2,
    titleKey: "whatsapp.step2Title",
    descKey: "whatsapp.step2Desc",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  {
    number: 3,
    icon: Phone,
    titleKey: "whatsapp.step3Title",
    descKey: "whatsapp.step3Desc",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    number: 4,
    icon: ShieldCheck,
    titleKey: "whatsapp.step4Title",
    descKey: "whatsapp.step4Desc",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    number: 5,
    icon: CheckCircle,
    titleKey: "whatsapp.step5Title",
    descKey: "whatsapp.step5Desc",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
];

export default function WhatsAppPage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [sessionName, setSessionName] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post<ApiResponse<WhatsAppSession>>("/whatsapp/sessions", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setSessionName("");
      toast.success(t("whatsapp.sessionCreated"));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const connectMutation = useMutation({
    mutationFn: (id: string) => api.post<ApiResponse<{ qrDataUrl?: string }>>(`/whatsapp/sessions/${id}/connect`),
    onSuccess: (data, id) => {
      if (data.data.qrDataUrl) {
        setQrCode(data.data.qrDataUrl);
        setConnectingId(id);
      } else {
        toast.success(t("whatsapp.sessionConnected"));
        setConnectingId(null);
        setQrCode(null);
      }
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/whatsapp/sessions/${id}/disconnect`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success(t("whatsapp.sessionDisconnected"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/whatsapp/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success(t("whatsapp.sessionDeleted"));
    },
  });

  const sessions = data?.data || [];

  useEffect(() => {
    if (connectingId) {
      const session = sessions.find((s) => s.id === connectingId);
      if (session?.status === "connected") {
        setQrCode(null);
        setConnectingId(null);
        toast.success(t("whatsapp.whatsappConnected"));
      }
    }
  }, [sessions, connectingId]);

  const handleMetaSuccess = async (code: string, wabaId: string, phoneNumberId: string) => {
    try {
      await api.post<ApiResponse<any>>("/meta/exchange-token", {
        code,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
      });
      toast.success("WhatsApp Business conectado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con Meta");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <DashboardHeader
        title={t("whatsapp.title")}
        description={t("whatsapp.subtitle")}
      />

      {/* ─── META CLOUD: Connect Button (Top) + Step-by-step Guide ─── */}
      <DashboardCard padding="lg">
          <DashboardCardHeader>
            <div>
              <DashboardCardTitle className="text-lg">
                {t("whatsapp.connectBusiness")}
              </DashboardCardTitle>
              <DashboardCardDescription className="!text-sm !text-slate-500 mt-1">
                {t("whatsapp.connectBusinessDesc")}
              </DashboardCardDescription>
            </div>
          </DashboardCardHeader>

          {/* Connect button - TOP */}
          <div className="mb-8">
            <MetaSignupButton onSuccess={handleMetaSuccess} />
          </div>

          {/* Step-by-step guide */}
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-6 top-8 bottom-8 w-px bg-slate-200 hidden md:block" />

            <div className="space-y-3 sm:space-y-4">
              {SETUP_STEPS.map((step) => (
                <div
                  key={step.number}
                  className={`relative flex gap-3 sm:gap-4 rounded-2xl border ${step.border} ${step.bg} p-3 sm:p-4 md:p-5`}
                >
                  {/* Step number circle */}
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center`}>
                    <step.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${step.color}`} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] sm:text-xs font-bold ${step.color} uppercase tracking-wider`}>
                        Paso {step.number}
                      </span>
                    </div>
                    <h4 className="font-display text-xs sm:text-sm font-bold text-slate-900">
                      {t(step.titleKey)}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                      {t(step.descKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connect button - BOTTOM */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-3 text-center">
              {t("whatsapp.readyToStart")}
            </p>
            <MetaSignupButton onSuccess={handleMetaSuccess} />
          </div>
        </DashboardCard>

      {/* ─── BAILEYS: Create QR Session ─── */}
      <DashboardCard>
        <DashboardCardHeader>
          <div>
            <DashboardCardTitle>{t("whatsapp.newSession")}</DashboardCardTitle>
            <DashboardCardDescription>{t("whatsapp.connectNumber")}</DashboardCardDescription>
          </div>
        </DashboardCardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (sessionName.trim()) createMutation.mutate(sessionName.trim());
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            placeholder={t("whatsapp.sessionPlaceholder")}
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 sm:max-w-md w-full"
          />
          <button
            type="submit"
            disabled={createMutation.isPending || !sessionName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("common.create")}
          </button>
        </form>
      </DashboardCard>

      {/* QR Code */}
      {qrCode && connectingId && (
        <DashboardCard>
          <DashboardCardHeader>
            <div>
              <DashboardCardTitle>{t("whatsapp.scanQr")}</DashboardCardTitle>
              <DashboardCardDescription>{t("whatsapp.scanInstructions")}</DashboardCardDescription>
            </div>
          </DashboardCardHeader>
          <div className="flex justify-center">
            <img src={qrCode} alt="QR Code" className="rounded-2xl" width={300} height={300} />
          </div>
        </DashboardCard>
      )}

      {/* ─── Sessions List ─── */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-center text-slate-400 py-8 text-sm">{t("whatsapp.loadingSessions")}</p>
        ) : sessions.length === 0 ? (
          <DashboardCard>
            <div className="py-8 text-center text-slate-400 text-sm">
              {t("whatsapp.noSessions")}
            </div>
          </DashboardCard>
        ) : (
          [...sessions]
            .sort((a, b) => {
              const order = { connected: 0, connecting: 1, qr_pending: 2, disconnected: 3 };
              return (order[a.status] ?? 9) - (order[b.status] ?? 9);
            })
            .map((session) => {
              const isMeta = session.connectionType === "meta_cloud";
              return (
                <DashboardCard key={session.id} className={isMeta ? "border-blue-200" : ""}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 md:p-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm font-bold text-slate-900">{session.name}</h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            statusStyles[session.status] || "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {t(`whatsapp.${session.status}`)}
                        </span>
                        {isMeta && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                            Meta Cloud
                          </span>
                        )}
                      </div>
                      {session.phone && (
                        <p className="text-sm text-slate-400 font-mono">+{session.phone}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {session.status === "disconnected" && !isMeta && (
                        <button
                          onClick={() => connectMutation.mutate(session.id)}
                          disabled={connectMutation.isPending}
                          className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5"
                        >
                          <Plug className="h-4 w-4" />
                          {t("whatsapp.connect")}
                        </button>
                      )}
                      {session.status === "connected" && !isMeta && (
                        <button
                          onClick={() => disconnectMutation.mutate(session.id)}
                          className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5"
                        >
                          <PlugZap className="h-4 w-4" />
                          {t("whatsapp.disconnect")}
                        </button>
                      )}
                      {session.status === "qr_pending" && (
                        <button
                          onClick={() => connectMutation.mutate(session.id)}
                          className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw className="h-4 w-4" />
                          {t("whatsapp.newQr")}
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(session.id)}
                        className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </DashboardCard>
              );
            })
        )}
      </div>
    </div>
  );
}
