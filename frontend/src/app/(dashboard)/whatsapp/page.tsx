"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Plug, PlugZap, Trash2, RefreshCw, Send, BarChart3, X } from "lucide-react";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
  disconnected: "secondary",
  connecting: "warning",
  connected: "success",
  qr_pending: "warning",
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
      <div>
        <h1 className="text-lg md:text-xl font-semibold">{t('whatsapp.title')}</h1>
        <p className="text-muted-foreground">{t('whatsapp.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('whatsapp.newSession')}</CardTitle>
          <CardDescription>{t('whatsapp.connectNumber')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (sessionName.trim()) createMutation.mutate(sessionName.trim());
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <Input
              placeholder={t('whatsapp.sessionPlaceholder')}
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="sm:max-w-md"
            />
            <Button type="submit" disabled={createMutation.isPending || !sessionName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('common.create')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {qrCode && connectingId && (
        <Card className="border-whatsapp">
          <CardHeader>
            <CardTitle className="text-lg">{t('whatsapp.scanQr')}</CardTitle>
            <CardDescription>
              {t('whatsapp.scanInstructions')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <img src={qrCode} alt="QR Code" className="rounded-lg" width={300} height={300} />
          </CardContent>
        </Card>
      )}

      {connectedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('whatsapp.quickSend')}</CardTitle>
            <CardDescription>{t('whatsapp.quickSendDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
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
                  <label className="text-sm font-medium mb-1 block">{t('whatsapp.sessionLabel')}</label>
                  <select
                    className="flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm"
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
              <div className="flex gap-2">
                <Input
                  placeholder={t('whatsapp.phonePlaceholder')}
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <Textarea
                placeholder={t('whatsapp.messagePlaceholder')}
                value={quickMessage}
                onChange={(e) => setQuickMessage(e.target.value)}
                rows={3}
                className="max-w-md"
              />
              <Button
                type="submit"
                disabled={sendQuickMutation.isPending || !quickPhone.trim() || !quickMessage.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                {sendQuickMutation.isPending ? t('whatsapp.enviando') : t('messages.sendMessage')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Poll Section */}
      {connectedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('whatsapp.sendPoll')}
            </CardTitle>
            <CardDescription>{t('whatsapp.sendPollDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
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
                  className="flex h-9 w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={pollSessionId || connectedSessions[0]?.id}
                  onChange={(e) => setPollSessionId(e.target.value)}
                >
                  {connectedSessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                  ))}
                </select>
              )}
              <Input
                placeholder={t('whatsapp.phonePlaceholder')}
                value={pollPhone}
                onChange={(e) => setPollPhone(e.target.value)}
                className="max-w-xs"
              />
              <Input
                placeholder={t('campaigns.pollQuestion')}
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="max-w-md"
              />
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium">{t('whatsapp.pollOptionsLabel')}</label>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`${t('whatsapp.optionPlaceholder')} ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[i] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 12 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPollOptions([...pollOptions, ""])}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {t('whatsapp.addOption')}
                  </Button>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollMultiSelect}
                  onChange={(e) => setPollMultiSelect(e.target.checked)}
                  className="rounded"
                />
                {t('whatsapp.multiSelect')}
              </label>
              <Button
                type="submit"
                disabled={sendPollMutation.isPending || !pollPhone.trim() || !pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                {sendPollMutation.isPending ? t('whatsapp.enviando') : t('whatsapp.sendPoll')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t('whatsapp.loadingSessions')}</p>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('whatsapp.noSessions')}
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{session.name}</h3>
                    <Badge variant={statusColors[session.status]}>{t(`whatsapp.${session.status}`)}</Badge>
                  </div>
                  {session.phone && (
                    <p className="text-sm text-muted-foreground font-mono">+{session.phone}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {session.status === "disconnected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => connectMutation.mutate(session.id)}
                      disabled={connectMutation.isPending}
                    >
                      <Plug className="mr-1 h-4 w-4" />
                      {t('whatsapp.connect')}
                    </Button>
                  )}
                  {session.status === "connected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => disconnectMutation.mutate(session.id)}
                    >
                      <PlugZap className="mr-1 h-4 w-4" />
                      {t('whatsapp.disconnect')}
                    </Button>
                  )}
                  {session.status === "qr_pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => connectMutation.mutate(session.id)}
                    >
                      <RefreshCw className="mr-1 h-4 w-4" />
                      {t('whatsapp.newQr')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(session.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
