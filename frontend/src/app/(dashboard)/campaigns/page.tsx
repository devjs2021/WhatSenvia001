"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, uploadFile } from "@/lib/api";
import { useI18n } from "@/i18n";
import type { ApiResponse, WhatsAppSession, PaginatedResponse, Contact } from "@/types";
import { toast } from "sonner";
import {
  Smartphone,
  Zap,
  Send,
  Plus,
  X,
  Users,
  FileSpreadsheet,
  FileText,
  List,
  ChevronDown,
  MessageSquare,
  BarChart2,
  Loader2,
  Shield,
  Radio,
  CalendarClock,
  Braces,
  History,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription } from "@/components/ui/dashboard-card";
import CampaignControlTab from "./campaign-control-tab";
import CampaignMonitorTab from "./campaign-monitor-tab";
import ScheduledTab from "./scheduled-tab";
import TemplatesTab from "./templates-tab";
import MetaTemplatesTab from "./meta-templates-tab";
import UnifiedMetaTab from "./unified-meta-tab";
import HistoryTab from "./history-tab";

interface Template {
  id: string;
  name: string;
  content: string;
  category: string | null;
}

interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: Array<{
    type: string;
    text?: string;
    example?: { body_text?: string[][] };
    parameters?: Array<{ type: string }>;
  }>;
}

interface ContactList {
  id: string;
  name: string;
  contactCount: number;
}

type SendMode = "manual" | "lists";
type ContentType = "text" | "poll";
type SpeedPreset = "slow" | "normal" | "fast" | "turbo";

type CampaignTab = "campaigns" | "unified-meta" | "control" | "monitor" | "scheduled" | "templates" | "meta-templates" | "history";

const tabConfig: Record<CampaignTab, { label: string; icon: any }> = {
  campaigns: { label: "Campanas", icon: Send },
  "unified-meta": { label: "Campanas Meta", icon: Zap },
  control: { label: "Control", icon: Shield },
  monitor: { label: "Monitor", icon: Radio },
  scheduled: { label: "Programados", icon: CalendarClock },
  templates: { label: "Plantillas", icon: FileText },
  "meta-templates": { label: "Meta Templates", icon: FileText },
  history: { label: "Historial", icon: History },
};

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const { locale, t } = useI18n();
  const [activeTab, setActiveTab] = useState<CampaignTab>("campaigns");

  const speedPresets: Record<SpeedPreset, { label: string; seconds: string; msgsPerMin: number; color: string }> = {
    slow:   { label: t('campaigns.slow'),   seconds: "15s", msgsPerMin: 4,  color: "text-blue-500" },
    normal: { label: t('campaigns.normal'), seconds: "8s",  msgsPerMin: 8,  color: "text-green-500" },
    fast:   { label: t('campaigns.fast'),   seconds: "3s",  msgsPerMin: 20, color: "text-orange-500" },
    turbo:  { label: t('campaigns.turbo'),  seconds: "1s",  msgsPerMin: 30, color: "text-red-500" },
  };

  const [sessionId, setSessionId] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>("manual");
  const [speed, setSpeed] = useState<SpeedPreset>("normal");
  const [manualNumbers, setManualNumbers] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [listPhones, setListPhones] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>("text");
  const [message, setMessage] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollMultiSelect, setPollMultiSelect] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const [customVarName, setCustomVarName] = useState("");
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });
  const { data: contactsData } = useQuery({
    queryKey: ["contacts-all"],
    queryFn: () => api.get<PaginatedResponse<Contact>>("/contacts?limit=1000"),
  });
  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<ApiResponse<string[]>>("/contacts/tags"),
  });
  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<{ success: boolean; data: Template[] }>("/templates"),
  });
  const { data: contactListsData } = useQuery({
    queryKey: ["contact-lists"],
    queryFn: () => api.get<{ success: boolean; data: ContactList[] }>("/contact-lists"),
  });
  const { data: metadataKeysData } = useQuery({
    queryKey: ["contact-metadata-keys"],
    queryFn: () => api.get<ApiResponse<string[]>>("/contacts/metadata-keys"),
  });

  const sessions = sessionsData?.data || [];
  const contacts = contactsData?.data || [];
  const tags = tagsData?.data || [];
  const templates = templatesData?.data || [];
  const contactLists = contactListsData?.data || [];
  const selectedSession = sessions.find((s) => s.id === sessionId);

  // Si la sesión seleccionada ya no existe (se eliminó/reconectó en otra
  // pestaña o pantalla), no la dejes seleccionada en silencio — eso mandaba
  // campañas nuevas a una sesión muerta ("WhatsApp session not found").
  useEffect(() => {
    if (sessionId && sessions.length > 0 && !sessions.some((s) => s.id === sessionId)) {
      setSessionId("");
    }
  }, [sessions, sessionId]);

  const detectedNumbers = useMemo(() => {
    if (!manualNumbers.trim()) return [];
    return manualNumbers
      .split(/[,\n\r;]+/)
      .map((n) => n.replace(/[^0-9]/g, "").trim())
      .filter((n) => n.length >= 10);
  }, [manualNumbers]);

  const filteredContacts = useMemo(() => {
    if (!selectedTag) return contacts;
    return contacts.filter((c) => c.tags?.includes(selectedTag));
  }, [contacts, selectedTag]);

  const totalRecipients = useMemo(() => {
    if (sendMode === "manual") return detectedNumbers.length;
    if (selectedListId) return listPhones.length;
    return filteredContacts.length;
  }, [sendMode, detectedNumbers, selectedListId, listPhones, filteredContacts]);

  async function handleSelectList(listId: string) {
    setSelectedListId(listId);
    setSelectedTag("");
    if (listId) {
      try {
        const res = await api.get<{ success: boolean; data: string[] }>(`/contact-lists/${listId}/phones`);
        setListPhones(res.data);
      } catch {
        setListPhones([]);
      }
    } else {
      setListPhones([]);
    }
  }

  const sendMutation = useMutation({
    mutationFn: async () => {
      let phonesToSend: string[] = [];
      if (sendMode === "manual") phonesToSend = detectedNumbers;
      else if (selectedListId) phonesToSend = listPhones;
      else phonesToSend = filteredContacts.map((c) => c.phone);

      const tempTag = `envio-${Date.now()}`;
      await api.post("/contacts/upsert-bulk", { phones: phonesToSend, tag: tempTag });

      const campaignPayload: Record<string, any> = {
        name: `Envio ${new Date().toLocaleString(locale === 'es' ? 'es-CO' : 'en-US')}`,
        sessionId,
        message: isMetaCloud && selectedMetaTemplateId ? `[Template: ${selectedMetaTemplate?.name}]` : message,
        targetTags: [tempTag],
        messagesPerMinute: speedPresets[speed].msgsPerMin,
      };

      if (isMetaCloud && selectedMetaTemplateId) {
        campaignPayload.isTemplateCampaign = true;
        campaignPayload.metaTemplateId = selectedMetaTemplateId;
        campaignPayload.templateParams = templateParamMapping;
      }

      const campaignRes = await api.post<ApiResponse<any>>("/campaigns", campaignPayload);
      await api.post(`/campaigns/${campaignRes.data.id}/start`);
      return campaignRes.data.id;
    },
    onSuccess: () => {
      toast.success(t('campaigns.sendingTo', { count: totalRecipients }));
      setManualNumbers("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["contacts-all"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sendPollMutation = useMutation({
    mutationFn: async () => {
      let numbers: string[];
      if (sendMode === "manual") numbers = detectedNumbers;
      else if (selectedListId) numbers = listPhones;
      else numbers = filteredContacts.map((c) => c.phone);

      const validOptions = pollOptions.filter((o) => o.trim());
      return api.post("/messages/send-poll-bulk", {
        sessionId,
        phones: numbers,
        question: pollQuestion,
        options: validOptions,
        multiSelect: pollMultiSelect,
      });
    },
    onSuccess: () => {
      toast.success(t('campaigns.pollSentTo', { count: totalRecipients }));
      setPollQuestion("");
      setPollOptions(["", ""]);
      setManualNumbers("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Meta template state
  const [selectedMetaTemplateId, setSelectedMetaTemplateId] = useState("");
  const [templateParamMapping, setTemplateParamMapping] = useState<Record<string, string[]>>({});
  const [syncing, setSyncing] = useState(false);

  const isMetaCloud = selectedSession?.connectionType === "meta_cloud";

  useEffect(() => {
    if (isMetaCloud && contentType === "poll") setContentType("text");
  }, [isMetaCloud]);

  const { data: metaTemplatesData, refetch: refetchMetaTemplates } = useQuery({
    queryKey: ["meta-templates", sessionId],
    queryFn: () => api.get<{ success: boolean; data: MetaTemplate[] }>(`/meta-templates?sessionId=${sessionId}`),
    enabled: !!sessionId && isMetaCloud,
  });
  const metaTemplates = metaTemplatesData?.data || [];
  const selectedMetaTemplate = metaTemplates.find((t) => t.id === selectedMetaTemplateId);

  function getTemplateBodyParams(tpl: MetaTemplate): number {
    const bodyComp = tpl.components.find((c) => c.type === "BODY");
    if (!bodyComp?.text) return 0;
    const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  }

  function getTemplateHeaderParams(tpl: MetaTemplate): number {
    const headerComp = tpl.components.find((c) => c.type === "HEADER");
    if (!headerComp?.text) return 0;
    const matches = headerComp.text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  }

  function handleSelectMetaTemplate(templateId: string) {
    setSelectedMetaTemplateId(templateId);
    const tpl = metaTemplates.find((t) => t.id === templateId);
    if (tpl) {
      const mapping: Record<string, string[]> = {};
      const headerCount = getTemplateHeaderParams(tpl);
      if (headerCount > 0) mapping.header = Array(headerCount).fill("name");
      const bodyCount = getTemplateBodyParams(tpl);
      if (bodyCount > 0) mapping.body = Array(bodyCount).fill("name");
      setTemplateParamMapping(mapping);
    } else {
      setTemplateParamMapping({});
    }
  }

  async function handleSyncMetaTemplates() {
    if (!sessionId) return;
    setSyncing(true);
    try {
      await api.post("/meta-templates/sync", { sessionId });
      await refetchMetaTemplates();
      toast.success(t('campaigns.templatesSynced'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(false);
    }
  }

  const metadataKeys = metadataKeysData?.data || [];
  const contactFieldOptions = [
    { value: "name", label: t('campaigns.fieldName') },
    { value: "phone", label: t('campaigns.fieldPhone') },
    { value: "email", label: t('campaigns.fieldEmail') },
    ...metadataKeys.map((key) => ({ value: key, label: `📊 ${key}` })),
  ];

  const [uploading, setUploading] = useState(false);
  async function handleExcelUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const json = await uploadFile<ApiResponse<{ phones: string[]; imported: number }>>("/contacts/import-excel", formData);
      const phones: string[] = json.data.phones || [];
      if (phones.length > 0) {
        setManualNumbers((prev) => {
          const existing = prev.trim();
          return existing ? `${existing}\n${phones.join("\n")}` : phones.join("\n");
        });
      }
      toast.success(t('campaigns.importedCount', { count: json.data.imported }));
      queryClient.invalidateQueries({ queryKey: ["contacts-all"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setShowExcelImport(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  function insertVariable(varName: string) {
    const tag = `{{${varName}}}`;
    const textarea = messageRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = message.slice(0, start);
      const after = message.slice(end);
      setMessage(before + tag + after);
      setTimeout(() => {
        textarea.focus();
        const pos = start + tag.length;
        textarea.setSelectionRange(pos, pos);
      }, 0);
    } else {
      setMessage((m) => m + tag);
    }
    setShowVarMenu(false);
    setCustomVarName("");
  }

  function handleSend() {
    if (!sessionId) return toast.error(t('campaigns.selectDeviceError'));
    if (selectedSession?.status !== "connected") return toast.error(t('campaigns.deviceNotConnectedError'));
    if (totalRecipients === 0) return toast.error(t('campaigns.noRecipientsError'));
    if (contentType === "poll") {
      const validOpts = pollOptions.filter((o) => o.trim());
      if (!pollQuestion.trim() || validOpts.length < 2) return toast.error(t('campaigns.completePollError'));
      sendPollMutation.mutate();
    } else {
      if (isMetaCloud) {
        if (!selectedMetaTemplateId) return toast.error(t('campaigns.selectTemplateError'));
      } else {
        if (!message.trim()) return toast.error(t('campaigns.writeMessageError'));
      }
      sendMutation.mutate();
    }
  }

  const isSending = sendMutation.isPending || sendPollMutation.isPending;
  const isConnected = selectedSession?.status === "connected";

  // Pre-send cost estimate for Meta Cloud template campaigns
  const { data: costEstimate } = useQuery({
    queryKey: ["cost-estimate", selectedMetaTemplateId, totalRecipients, selectedTag],
    queryFn: () =>
      api.post<{ success: boolean; data: { category: string; contactCount: number; estimatedCost: number; currency: string } }>("/consumption/estimate", {
        templateId: selectedMetaTemplateId || undefined,
        tags: selectedTag ? [selectedTag] : undefined,
        contactCount: totalRecipients,
      }),
    enabled: isMetaCloud && !!selectedMetaTemplateId && totalRecipients > 0,
    staleTime: 30000,
  });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {(Object.entries(tabConfig) as [CampaignTab, { label: string; icon: any }][]).map(([key, tab]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "campaigns" && (
        <>
          {/* Config bar */}
          <DashboardCard>
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              {/* Device */}
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">{t('campaigns.device')}</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer w-full"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                  >
                    <option value="">{t('campaigns.selectDevice')}</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.connectionType === "meta_cloud" ? "Meta" : "WhatsApp"} {s.phone ? `· ${s.phone}` : `· ${s.name}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Mode */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">{t('campaigns.mode')}</label>
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                  {([["manual", t('campaigns.manual'), Users], ["lists", t('campaigns.lists'), List]] as const).map(([mode, label, Icon]) => (
                    <button
                      key={mode}
                      onClick={() => { setSendMode(mode); setSelectedListId(""); setListPhones([]); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        sendMode === mode
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">{t('campaigns.speed')}</label>
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
                  {(Object.entries(speedPresets) as [SpeedPreset, { label: string; seconds: string; color: string }][]).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => setSpeed(key)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        speed === key
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className={`text-[10px] ${preset.color}`}>({preset.seconds})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Main two-column section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Recipients */}
            <DashboardCard>
              <DashboardCardHeader>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <DashboardCardTitle>{t('campaigns.recipients')}</DashboardCardTitle>
                    <DashboardCardDescription>
                      {totalRecipients > 0 && `${totalRecipients} ${t('campaigns.numbers')}`}
                    </DashboardCardDescription>
                  </div>
                  {totalRecipients > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                      {totalRecipients} {t('campaigns.numbers')}
                    </span>
                  )}
                </div>
              </DashboardCardHeader>

              {sendMode === "manual" ? (
                <div className="space-y-3">
                  <textarea
                    placeholder={t('campaigns.pasteNumbers')}
                    rows={8}
                    value={manualNumbers}
                    onChange={(e) => setManualNumbers(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {detectedNumbers.length} {t('campaigns.numbersDetected')}
                    </span>
                    <button
                      onClick={() => setShowExcelImport(!showExcelImport)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      {t('campaigns.fromExcel')}
                    </button>
                  </div>
                  {showExcelImport && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 bg-slate-50 space-y-2">
                      <p className="text-xs text-slate-400">{t('campaigns.excelInstructions')}</p>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExcelUpload(f); }}
                        className="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                      />
                      {uploading && <p className="text-xs text-slate-400 animate-pulse">{t('campaigns.importing')}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {contactLists.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <List className="h-3 w-3" /> {t('campaigns.savedLists')}
                      </label>
                      <div className="relative">
                        <select
                          className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer w-full pr-9"
                          value={selectedListId}
                          onChange={(e) => handleSelectList(e.target.value)}
                        >
                          <option value="">{t('campaigns.selectList')}</option>
                          {contactLists.map((list) => (
                            <option key={list.id} value={list.id}>
                              {list.name} ({list.contactCount} contacts)
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                  {!selectedListId && (
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Users className="h-3 w-3" /> {t('campaigns.filterTag')}
                      </label>
                      <div className="relative">
                        <select
                          className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer w-full pr-9"
                          value={selectedTag}
                          onChange={(e) => setSelectedTag(e.target.value)}
                        >
                          <option value="">{t('campaigns.allContacts')}</option>
                          {tags.map((tag) => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                  <div className="rounded-2xl bg-slate-50 p-6 flex flex-col items-center justify-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                      {selectedListId ? <List className="h-6 w-6 text-slate-400" /> : <Users className="h-6 w-6 text-slate-400" />}
                    </div>
                    <p className="font-display text-3xl font-bold text-slate-900">{totalRecipients}</p>
                    <p className="text-xs text-slate-400 text-center">
                      {selectedListId
                        ? t('campaigns.inList', { name: contactLists.find((l) => l.id === selectedListId)?.name ?? '' })
                        : selectedTag ? t('campaigns.withTag', { tag: selectedTag }) : t('campaigns.inTotal')}
                    </p>
                  </div>
                </div>
              )}
            </DashboardCard>

            {/* Content */}
            <DashboardCard>
              <DashboardCardHeader>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <DashboardCardTitle>{t('campaigns.content')}</DashboardCardTitle>
                  </div>
                  <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                    <button
                      onClick={() => setContentType("text")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        contentType === "text"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {t('campaigns.text')}
                    </button>
                    <button
                      onClick={() => !isMetaCloud && setContentType("poll")}
                      disabled={isMetaCloud}
                      title={isMetaCloud ? "Encuestas solo disponibles con WhatsApp (Baileys)" : ""}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isMetaCloud
                          ? "text-slate-300 cursor-not-allowed"
                          : contentType === "poll"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      {t('campaigns.poll')}
                      {isMetaCloud && <span className="text-[10px] ml-1 opacity-60">QR</span>}
                    </button>
                  </div>
                </div>
              </DashboardCardHeader>

              {isMetaCloud && contentType === "text" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <select
                        className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer w-full"
                        value={selectedMetaTemplateId}
                        onChange={(e) => handleSelectMetaTemplate(e.target.value)}
                      >
                        <option value="">{t('campaigns.selectMetaTemplate')}</option>
                        {metaTemplates.map((mt) => (
                          <option key={mt.id} value={mt.id}>
                            {mt.name} · {mt.language} · {mt.category}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                    <button
                      onClick={handleSyncMetaTemplates}
                      disabled={syncing}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {syncing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      {t('campaigns.syncTemplates')}
                    </button>
                  </div>

                  {selectedMetaTemplate && (
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('campaigns.templatePreview')}</p>
                        {selectedMetaTemplate.components.map((comp, i) => (
                          <div key={i} className="text-sm text-slate-700">
                            {comp.type === "HEADER" && comp.text && <p className="font-semibold">{comp.text}</p>}
                            {comp.type === "BODY" && comp.text && <p className="whitespace-pre-wrap">{comp.text}</p>}
                            {comp.type === "FOOTER" && comp.text && <p className="text-xs text-slate-400 mt-1">{comp.text}</p>}
                          </div>
                        ))}
                      </div>

                      {Object.entries(templateParamMapping).map(([compType, fields]) => (
                        <div key={compType} className="space-y-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase">{compType} {t('campaigns.parameters')}</p>
                          {fields.map((field, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-mono shrink-0">{`{{${idx + 1}}}`}</span>
                              <select
                                className="flex-1 appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                                value={field}
                                onChange={(e) => {
                                  const newMapping = { ...templateParamMapping };
                                  newMapping[compType] = [...fields];
                                  newMapping[compType][idx] = e.target.value;
                                  setTemplateParamMapping(newMapping);
                                }}
                              >
                                {contactFieldOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {metaTemplates.length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-6 flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-slate-300" />
                      <p className="text-sm text-slate-400 text-center">{t('campaigns.noMetaTemplates')}</p>
                      <p className="text-xs text-slate-400 text-center">{t('campaigns.syncToLoad')}</p>
                    </div>
                  )}
                </div>
              ) : contentType === "text" ? (
                <div className="space-y-3">
                  {templates.length > 0 && (
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <select
                        className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer w-full"
                        value=""
                        onChange={(e) => {
                          const t = templates.find((t) => t.id === e.target.value);
                          if (t) setMessage(t.content);
                        }}
                      >
                        <option value="">{t('campaigns.useTemplate')}</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.category ? `· ${t.category}` : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  )}

                  {/* Format toolbar */}
                  <div className="flex items-center gap-1 border-b border-slate-100 pb-2">
                    {[
                      { label: <strong className="text-xs">B</strong>, insert: "*texto*", title: t('campaigns.bold') },
                      { label: <em className="text-xs">I</em>, insert: "_texto_", title: t('campaigns.italic') },
                      { label: <span className="text-xs line-through">S</span>, insert: "~texto~", title: t('campaigns.strikethrough') },
                      { label: <span className="text-xs font-mono">{'</>'}</span>, insert: "```codigo```", title: t('campaigns.code') },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        title={btn.title}
                        onClick={() => setMessage((m) => m + btn.insert)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        {btn.label}
                      </button>
                    ))}
                    <div className="h-4 w-px bg-slate-200 mx-1" />
                    <div className="relative">
                      <button
                        title={t('campaigns.insertVariable')}
                        onClick={() => setShowVarMenu(!showVarMenu)}
                        className="h-7 px-2 rounded-lg flex items-center gap-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs font-medium"
                      >
                        <Braces className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('campaigns.variable')}</span>
                      </button>
                      {showVarMenu && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => { setShowVarMenu(false); setCustomVarName(""); }} />
                          <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-20">
                            <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('campaigns.defaultVars')}</p>
                            {[
                              { key: "name", label: t('campaigns.fieldName'), example: "Juan" },
                              { key: "phone", label: t('campaigns.fieldPhone'), example: "573001234567" },
                              { key: "email", label: t('campaigns.fieldEmail'), example: "j@mail.com" },
                            ].map((v) => (
                              <button
                                key={v.key}
                                onClick={() => insertVariable(v.key)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors"
                              >
                                <span className="text-sm text-slate-700 font-mono">{`{{${v.key}}}`}</span>
                                <span className="text-[10px] text-slate-400">{v.example}</span>
                              </button>
                            ))}
                            <div className="border-t border-slate-100 mt-1 pt-1">
                              <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('campaigns.customVar')}</p>
                              <div className="px-3 pb-2 flex gap-1.5">
                                <input
                                  placeholder={t('campaigns.customVarPlaceholder')}
                                  value={customVarName}
                                  onChange={(e) => setCustomVarName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                                  onKeyDown={(e) => { if (e.key === "Enter" && customVarName.trim()) insertVariable(customVarName.trim()); }}
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                                />
                                <button
                                  onClick={() => customVarName.trim() && insertVariable(customVarName.trim())}
                                  disabled={!customVarName.trim()}
                                  className="px-2 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-40"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {message && (
                      <div className="ml-auto flex gap-1 flex-wrap">
                        {message.match(/\{\{(\w+)\}\}/g)?.map((v, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-mono">{v}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <textarea
                    ref={messageRef}
                    placeholder={t('campaigns.writeMessage')}
                    rows={9}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    placeholder={t('campaigns.pollQuestion')}
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('campaigns.pollOptions')}</p>
                  <div className="space-y-2">
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          placeholder={`${t('campaigns.optionPlaceholder')} ${i + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...pollOptions];
                            newOpts[i] = e.target.value;
                            setPollOptions(newOpts);
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                            className="h-10 w-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {pollOptions.length < 12 && (
                    <button
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('campaigns.addOption')}
                    </button>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pollMultiSelect}
                      onChange={(e) => setPollMultiSelect(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
                    />
                    <span className="text-xs text-slate-500">{t('campaigns.multiSelect')}</span>
                  </label>
                </div>
              )}
            </DashboardCard>
          </div>

          {/* Cost estimate for Meta Cloud */}
          {isMetaCloud && costEstimate?.data && costEstimate.data.estimatedCost > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-amber-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
                <span className="text-xs font-semibold">{t("dashboard.estimatedCost")}</span>
              </div>
              <span className="text-sm font-bold text-amber-800">
                ${costEstimate.data.estimatedCost.toFixed(2)} {costEstimate.data.currency}
              </span>
              <span className="text-[10px] text-amber-600">
                ({costEstimate.data.contactCount} × {costEstimate.data.category})
              </span>
            </div>
          )}

          {/* Send button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {totalRecipients > 0 && (
                <span className="text-sm text-slate-500">
                  <strong className="text-slate-800">{totalRecipients}</strong> {t('campaigns.recipientsLower')}
                </span>
              )}
              {selectedSession && (
                <span className={`text-xs flex items-center gap-1 ${isConnected ? "text-emerald-500" : "text-red-400"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-400"}`} />
                  {isConnected ? t('campaigns.connected') : t('campaigns.disconnected')}
                </span>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={isSending || !isConnected || totalRecipients === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSending ? t('campaigns.sending') : 'Enviar'}
            </button>
          </div>
        </>
      )}

      {activeTab === "unified-meta" && <UnifiedMetaTab />}
      {activeTab === "control" && <CampaignControlTab />}
      {activeTab === "monitor" && <CampaignMonitorTab />}
      {activeTab === "scheduled" && <ScheduledTab />}
      {activeTab === "templates" && <TemplatesTab />}
      {activeTab === "meta-templates" && <MetaTemplatesTab />}
      {activeTab === "history" && <HistoryTab />}
    </div>
  );
}
