"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { toast } from "sonner";
import { Plus, Plug, PlugZap, Trash2, RefreshCw, Send, BarChart3, X } from "lucide-react";
import { MetaSignupButton } from "@/components/whatsapp/meta-signup-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription, DashboardCardIcon } from "@/components/ui/dashboard-card";

const statusStyles: Record<string, string> = {
  disconnected: "bg-slate-100 text-slate-500",
  connecting: "bg-amber-50 text-amber-600",
  connected: "bg-emerald-50 text-emerald-600",
  qr_pending: "bg-amber-50 text-amber-600",
};

export default function WhatsAppPage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [sessionName, setSessionName] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [quickPhone, setQuickPhone] = useState("");
  const [quickMessage, setQuickMessage] = useState("");
  const [quickSessionId, setQuickSessionId] = useState<string>("");

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
      toast.success(t('whatsapp.sessionCreated'));
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
        toast.success(t('whatsapp.sessionConnected'));
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
      toast.success(t('whatsapp.sessionDisconnected'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/whatsapp/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success(t('whatsapp.sessionDeleted'));
    },
  });

  const sendQuickMutation = useMutation({
    mutationFn: (payload: { sessionId: string; phone: string; content: string }) =>
      api.post("/messages/send-quick", payload),
    onSuccess: () => {
      toast.success(t('whatsapp.messageSent'));
      setQuickPhone("");
      setQuickMessage("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Poll state
  const [pollPhone, setPollPhone] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollMultiSelect, setPollMultiSelect] = useState(false);
  const [pollSessionId, setPollSessionId] = useState("");

  const sendPollMutation = useMutation({
    mutationFn: (payload: { sessionId: string; phone: string; question: string; options: string[]; multiSelect: boolean }) =>
      api.post("/messages/send-poll", payload),
    onSuccess: () => {
      toast.success(t('whatsapp.pollSent'));
      setPollPhone("");
      setPollQuestion("");
      setPollOptions(["", ""]);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sessions = data?.data || [];
  const connectedSessions = sessions.filter((s) => s.status === "connected");
  const hasMetaCloudSession = sessions.some((s) => s.connectionType === "meta_cloud");

  useEffect(() => {
    if (connectingId) {
      const session = sessions.find((s) => s.id === connectingId);
      if (session?.status === "connected") {
        setQrCode(null);
        setConnectingId(null);
        toast.success(t('whatsapp.whatsappConnected'));
      }
    }
  }, [sessions, connectingId]);

  return (
    <div className="space-y-4 md:space-y-6">
      <DashboardHeader
        title={t('whatsapp.title')}
        description={t('whatsapp.subtitle')}
      />

      {/* New Session */}
      <DashboardCard>
        <DashboardCardHeader>
          <div>
            <DashboardCardTitle>{t('whatsapp.newSession')}</DashboardCardTitle>
            <DashboardCardDescription>{t('whatsapp.connectNumber')}</DashboardCardDescription>
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
            placeholder={t('whatsapp.sessionPlaceholder')}
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
            {t('common.create')}
          </button>
        </form>
      </DashboardCard>

      {/* Meta Cloud API */}
      {!hasMetaCloudSession && (
        <div className="p-5 border border-blue-200 rounded-3xl bg-blue-50">
          <h3 className="font-display text-base font-bold text-blue-900 mb-1">
            Meta Cloud API (Oficial)
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            Conecta tu número de WhatsApp Business oficial sin usar QR
          </p>
          <MetaSignupButton
            onSuccess={async (code, wabaId, phoneNumberId) => {
              try {
                await api.post<ApiResponse<any>>('/meta/exchange-token', {
                  code,
                  waba_id: wabaId,
                  phone_number_id: phoneNumberId,
                })
                toast.success('WhatsApp Business conectado exitosamente')
                queryClient.invalidateQueries({ queryKey: ['sessions'] })
              } catch (err: any) {
                toast.error(err.message || 'Error al conectar con Meta')
              }
            }}
          />
        </div>
      )}

      {/* QR Code */}
      {qrCode && connectingId && (
        <DashboardCard>
          <DashboardCardHeader>
            <div>
              <DashboardCardTitle>{t('whatsapp.scanQr')}</DashboardCardTitle>
              <DashboardCardDescription>{t('whatsapp.scanInstructions')}</DashboardCardDescription>
            </div>
          </DashboardCardHeader>
          <div className="flex justify-center">
            <img src={qrCode} alt="QR Code" className="rounded-2xl" width={300} height={300} />
          </div>
        </DashboardCard>
      )}

      {/* Quick Send */}
      {connectedSessions.length > 0 && (
        <DashboardCard>
          <DashboardCardHeader>
            <div>
              <DashboardCardTitle>{t('whatsapp.quickSend')}</DashboardCardTitle>
              <DashboardCardDescription>{t('whatsapp.quickSendDesc')}</DashboardCardDescription>
            </div>
          </DashboardCardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const sid = quickSessionId || connectedSessions[0]?.id;
              if (sid && quickPhone.trim() && quickMessage.trim()) {
                sendQuickMutation.mutate({ sessionId: sid, phone: quickPhone.trim(), content: quickMessage.trim() });
              }
            }}
            className="space-y-4"
          >
            {connectedSessions.length > 1 && (
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">{t('whatsapp.sessionLabel')}</label>
                <select
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer max-w-md w-full"
                  value={quickSessionId || connectedSessions[0]?.id}
                  onChange={(e) => setQuickSessionId(e.target.value)}
                >
                  {connectedSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <input
              placeholder={t('whatsapp.phonePlaceholder')}
              value={quickPhone}
              onChange={(e) => setQuickPhone(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 max-w-xs w-full"
            />
            <textarea
              placeholder={t('whatsapp.messagePlaceholder')}
              value={quickMessage}
              onChange={(e) => setQuickMessage(e.target.value)}
              rows={3}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 max-w-md w-full"
            />
            <button
              type="submit"
              disabled={sendQuickMutation.isPending || !quickPhone.trim() || !quickMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {sendQuickMutation.isPending ? t('whatsapp.enviando') : t('messages.sendMessage')}
            </button>
          </form>
        </DashboardCard>
      )}

      {/* Poll Section */}
      {connectedSessions.length > 0 && (
        <DashboardCard>
          <DashboardCardHeader>
            <div>
              <DashboardCardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('whatsapp.sendPoll')}
              </DashboardCardTitle>
              <DashboardCardDescription>{t('whatsapp.sendPollDesc')}</DashboardCardDescription>
            </div>
          </DashboardCardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const sid = pollSessionId || connectedSessions[0]?.id;
              const validOptions = pollOptions.filter((o) => o.trim());
              if (sid && pollPhone.trim() && pollQuestion.trim() && validOptions.length >= 2) {
                sendPollMutation.mutate({
                  sessionId: sid,
                  phone: pollPhone.trim(),
                  question: pollQuestion.trim(),
                  options: validOptions,
                  multiSelect: pollMultiSelect,
                });
              }
            }}
            className="space-y-4"
          >
            {connectedSessions.length > 1 && (
              <select
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer max-w-md w-full"
                value={pollSessionId || connectedSessions[0]?.id}
                onChange={(e) => setPollSessionId(e.target.value)}
              >
                {connectedSessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                ))}
              </select>
            )}
            <input
              placeholder={t('whatsapp.phonePlaceholder')}
              value={pollPhone}
              onChange={(e) => setPollPhone(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 max-w-xs w-full"
            />
            <input
              placeholder={t('campaigns.pollQuestion')}
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 max-w-md w-full"
            />
            <div className="space-y-2 max-w-md">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('whatsapp.pollOptionsLabel')}</label>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder={`${t('whatsapp.optionPlaceholder')} ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[i] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                      className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 12 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  {t('whatsapp.addOption')}
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={pollMultiSelect}
                onChange={(e) => setPollMultiSelect(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              {t('whatsapp.multiSelect')}
            </label>
            <button
              type="submit"
              disabled={sendPollMutation.isPending || !pollPhone.trim() || !pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {sendPollMutation.isPending ? t('whatsapp.enviando') : t('whatsapp.sendPoll')}
            </button>
          </form>
        </DashboardCard>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-center text-slate-400 py-8 text-sm">{t('whatsapp.loadingSessions')}</p>
        ) : sessions.length === 0 ? (
          <DashboardCard>
            <div className="py-8 text-center text-slate-400 text-sm">
              {t('whatsapp.noSessions')}
            </div>
          </DashboardCard>
        ) : (
          [...sessions].sort((a, b) => {
            const order = { connected: 0, connecting: 1, qr_pending: 2, disconnected: 3 };
            return (order[a.status] ?? 9) - (order[b.status] ?? 9);
          }).map((session) => {
            const isMeta = session.connectionType === "meta_cloud";
            return (
              <DashboardCard key={session.id} className={isMeta ? "border-blue-200" : ""}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm font-bold text-slate-900">{session.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[session.status] || "bg-slate-100 text-slate-500"}`}>
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
                        {t('whatsapp.connect')}
                      </button>
                    )}
                    {session.status === "connected" && !isMeta && (
                      <button
                        onClick={() => disconnectMutation.mutate(session.id)}
                        className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5"
                      >
                        <PlugZap className="h-4 w-4" />
                        {t('whatsapp.disconnect')}
                      </button>
                    )}
                    {session.status === "qr_pending" && (
                      <button
                        onClick={() => connectMutation.mutate(session.id)}
                        className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t('whatsapp.newQr')}
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
