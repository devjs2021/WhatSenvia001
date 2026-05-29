"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { toast } from "sonner";
import {
  Plus,
  X,
  Upload,
  FileSpreadsheet,
  ChevronDown,
  Smartphone,
  Send,
  Loader2,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Pencil,
  Eye,
  Braces,
} from "lucide-react";
import {
  DashboardCard,
  DashboardCardHeader,
  DashboardCardTitle,
  DashboardCardDescription,
} from "@/components/ui/dashboard-card";

interface UnifiedCampaign {
  id: string;
  name: string;
  message: string;
  status: string;
  templateName: string | null;
  templateStatus: string | null;
  templateComponents: any[] | null;
  contacts: Array<Record<string, string>> | null;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  rejectionReason: string | null;
  templateParams: Record<string, string[]> | null;
  createdAt: string;
}

interface ParsedExcel {
  columns: string[];
  rows: Array<Record<string, string>>;
  phoneColumn: string;
  totalRows: number;
}

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"] as const;
const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en_US", label: "English" },
  { code: "pt_BR", label: "Português" },
];

export default function UnifiedMetaTab() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [sessionId, setSessionId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [parsedExcel, setParsedExcel] = useState<ParsedExcel | null>(null);
  const [uploading, setUploading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState<string>("MARKETING");
  const [templateLanguage, setTemplateLanguage] = useState("es");
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [paramMapping, setParamMapping] = useState<Record<string, string[]>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Queries
  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["unified-campaigns"],
    queryFn: () => api.get<ApiResponse<UnifiedCampaign[]>>("/campaigns/unified"),
    refetchInterval: 30000,
  });

  const metaSessions = (sessionsData?.data || []).filter(
    (s) => s.connectionType === "meta_cloud"
  );
  const campaigns = campaignsData?.data || [];

  // Excel upload
  async function handleExcelUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/contacts/parse-excel", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al parsear Excel");
      setParsedExcel(json.data);
      toast.success(`${json.data.totalRows} ${t("unifiedCampaign.contactsLoaded")}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  // Detect body params
  const bodyParams = bodyText.match(/\{\{\d+\}\}/g) || [];

  // Update param mapping when body params change
  const updateParamMapping = useCallback(() => {
    const count = bodyParams.length;
    if (count > 0) {
      setParamMapping((prev) => {
        const body = prev.body || [];
        const newBody = Array(count)
          .fill("")
          .map((_, i) => body[i] || "name");
        return { ...prev, body: newBody };
      });
    }
  }, [bodyParams.length]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () => {
      if (!parsedExcel) throw new Error("No contacts loaded");

      const components: any[] = [];
      components.push({ type: "BODY", text: bodyText.trim() });
      if (footerText.trim()) {
        components.push({ type: "FOOTER", text: footerText.trim() });
      }

      return api.post("/campaigns/unified", {
        sessionId,
        name: campaignName.trim() || `Campaña ${new Date().toLocaleDateString()}`,
        contacts: parsedExcel.rows,
        templateName: templateName.trim(),
        templateCategory,
        templateLanguage,
        templateComponents: components,
        templateParams: paramMapping,
        messagesPerMinute: 8,
      });
    },
    onSuccess: () => {
      toast.success(t("unifiedCampaign.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["unified-campaigns"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: (campaignId: string) =>
      api.post(`/campaigns/${campaignId}/send-approved`),
    onSuccess: () => {
      toast.success(t("unifiedCampaign.sendSuccess"));
      queryClient.invalidateQueries({ queryKey: ["unified-campaigns"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (campaignId: string) => api.delete(`/campaigns/${campaignId}`),
    onSuccess: () => {
      toast.success(t("unifiedCampaign.deleted"));
      queryClient.invalidateQueries({ queryKey: ["unified-campaigns"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  function resetForm() {
    setShowForm(false);
    setCampaignName("");
    setParsedExcel(null);
    setTemplateName("");
    setTemplateCategory("MARKETING");
    setTemplateLanguage("es");
    setBodyText("");
    setFooterText("");
    setParamMapping({});
  }

  const canSubmit =
    sessionId &&
    templateName.trim() &&
    /^[a-z0-9_]+$/.test(templateName) &&
    bodyText.trim() &&
    parsedExcel &&
    parsedExcel.rows.length > 0 &&
    !createMutation.isPending;

  function getStatusBadge(campaign: UnifiedCampaign) {
    const tplStatus = campaign.templateStatus;
    if (campaign.status === "rejected" || tplStatus === "REJECTED") {
      return { color: "bg-red-100 text-red-700 border-red-200", label: t("unifiedCampaign.rejected"), icon: XCircle };
    }
    if (tplStatus === "APPROVED") {
      return { color: "bg-green-100 text-green-700 border-green-200", label: t("unifiedCampaign.approved"), icon: CheckCircle };
    }
    if (campaign.status === "scheduled" || campaign.status === "running") {
      return { color: "bg-blue-100 text-blue-700 border-blue-200", label: campaign.status === "running" ? "Enviando..." : "Programada", icon: Send };
    }
    if (campaign.status === "completed") {
      return { color: "bg-green-100 text-green-700 border-green-200", label: "Completada", icon: CheckCircle };
    }
    return { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: t("unifiedCampaign.pendingApproval"), icon: Clock };
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("unifiedCampaign.title")}</h2>
          <p className="text-xs text-slate-400">{t("unifiedCampaign.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            showForm
              ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? t("common.cancel") : t("unifiedCampaign.newCampaign")}
        </button>
      </div>

      {/* ═══ CREATION FORM ═══ */}
      {showForm && (
        <DashboardCard padding="lg">
          <div className="space-y-5">
            {/* Row 1: Session + Campaign Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  {t("campaigns.device")}
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                  >
                    <option value="">{t("campaigns.selectDevice")}</option>
                    {metaSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        Meta {s.phone ? `· ${s.phone}` : `· ${s.name}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  {t("unifiedCampaign.campaignName")}
                </label>
                <input
                  placeholder={t("unifiedCampaign.campaignNamePlaceholder")}
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            {/* Row 2: Upload Excel */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                {t("unifiedCampaign.uploadExcel")}
              </label>
              {!parsedExcel ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-emerald-300 transition-colors">
                  <FileSpreadsheet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 mb-3">{t("unifiedCampaign.uploadExcelHint")}</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium cursor-pointer transition-colors">
                    <Upload className="h-4 w-4" />
                    {t("unifiedCampaign.uploadExcel")}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleExcelUpload(f);
                      }}
                    />
                  </label>
                  {uploading && (
                    <p className="text-xs text-slate-400 mt-2 animate-pulse">{t("common.loading")}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">
                          {parsedExcel.totalRows} {t("unifiedCampaign.contactsLoaded")}
                        </p>
                        <p className="text-xs text-emerald-600">
                          {parsedExcel.columns.length} {t("unifiedCampaign.columnsDetected")}:{" "}
                          {parsedExcel.columns.join(", ")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setParsedExcel(null)}
                      className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-emerald-100 text-emerald-400 hover:text-emerald-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Row 3: Template config */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  {t("metaTemplates.formName")}
                </label>
                <input
                  placeholder="mi_plantilla"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className={`w-full bg-slate-50 border ${templateName && !/^[a-z0-9_]*$/.test(templateName) ? "border-red-300" : "border-slate-200"} rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">{t("metaTemplates.nameHint")}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  {t("metaTemplates.formCategory")}
                </label>
                <div className="relative">
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  {t("metaTemplates.formLanguage")}
                </label>
                <div className="relative">
                  <select
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                    className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>{lang.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 4: Message body */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Body <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = bodyParams.length + 1;
                    setBodyText((b) => b + `{{${nextNum}}}`);
                    setTimeout(updateParamMapping, 0);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <Braces className="h-3.5 w-3.5" />
                  {t("campaigns.insertVariable")}
                </button>
                {bodyParams.length > 0 && (
                  <div className="flex gap-1 flex-wrap ml-2">
                    {bodyParams.map((p, i) => (
                      <span key={i} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-mono">{p}</span>
                    ))}
                  </div>
                )}
              </div>
              <textarea
                placeholder={t("metaTemplates.bodyPlaceholder")}
                rows={4}
                value={bodyText}
                onChange={(e) => {
                  setBodyText(e.target.value);
                  setTimeout(updateParamMapping, 0);
                }}
                maxLength={1024}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-[10px] text-slate-400 mt-0.5 text-right">{bodyText.length}/1024</p>
            </div>

            {/* Footer (optional) */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Footer <span className="font-normal lowercase">({t("metaTemplates.optional")})</span>
              </label>
              <input
                placeholder={t("metaTemplates.footerPlaceholder")}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                maxLength={60}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Row 5: Variable mapping */}
            {bodyParams.length > 0 && parsedExcel && (
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  {t("unifiedCampaign.mapVariables")}
                </label>
                <p className="text-xs text-slate-400 mb-3">{t("unifiedCampaign.mapVariablesHint")}</p>
                <div className="space-y-2">
                  {bodyParams.map((param, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-mono bg-blue-50 px-2 py-1 rounded-lg shrink-0">
                        {param}
                      </span>
                      <span className="text-xs text-slate-400">→</span>
                      <div className="relative flex-1">
                        <select
                          value={paramMapping.body?.[idx] || "name"}
                          onChange={(e) => {
                            const newMapping = { ...paramMapping };
                            const body = [...(newMapping.body || [])];
                            body[idx] = e.target.value;
                            newMapping.body = body;
                            setParamMapping(newMapping);
                          }}
                          className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                        >
                          {parsedExcel.columns.map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WhatsApp Preview */}
            {bodyText && (
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  {t("metaTemplates.livePreview")}
                </label>
                <div className="rounded-2xl border border-slate-200 bg-[#e5ddd5] p-4">
                  <div className="max-w-[320px] mx-auto rounded-lg bg-white overflow-hidden shadow-sm">
                    <div className="p-3 space-y-1.5">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{bodyText}</p>
                      {footerText && <p className="text-[11px] text-slate-400">{footerText}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="text-sm text-slate-500">
                {parsedExcel && (
                  <span>
                    <strong className="text-slate-800">{parsedExcel.totalRows}</strong> {t("unifiedCampaign.contacts")}
                  </span>
                )}
                {bodyParams.length > 0 && (
                  <span className="ml-3">
                    <strong className="text-slate-800">{bodyParams.length}</strong> variables
                  </span>
                )}
              </div>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {createMutation.isPending ? t("unifiedCampaign.creating") : t("unifiedCampaign.createCampaign")}
              </button>
            </div>
          </div>
        </DashboardCard>
      )}

      {/* ═══ CAMPAIGN CARDS ═══ */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <DashboardCard key={i}>
              <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
            </DashboardCard>
          ))}
        </div>
      ) : campaigns.length === 0 && !showForm ? (
        <DashboardCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Send className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-base font-semibold text-slate-800 mb-2">{t("unifiedCampaign.noCampaigns")}</h3>
            <p className="text-sm text-slate-400 max-w-md">{t("unifiedCampaign.noCampaignsHint")}</p>
          </div>
        </DashboardCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => {
            const badge = getStatusBadge(campaign);
            const BadgeIcon = badge.icon;
            const isApproved = campaign.templateStatus === "APPROVED" && campaign.status === "pending_approval";
            const isRejected = campaign.status === "rejected" || campaign.templateStatus === "REJECTED";
            const isSendable = isApproved;
            const isRunningOrDone = ["scheduled", "running", "completed"].includes(campaign.status);
            const bodyComp = campaign.templateComponents?.find((c: any) => c.type === "BODY");

            return (
              <DashboardCard key={campaign.id} className={isRejected ? "border-red-200" : isApproved ? "border-green-200" : ""}>
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-sm font-bold text-slate-900 truncate">{campaign.name}</h3>
                      {campaign.templateName && (
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{campaign.templateName}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border shrink-0 ${badge.color}`}>
                      <BadgeIcon className="h-3 w-3" />
                      {badge.label}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {campaign.totalContacts} {t("unifiedCampaign.contacts")}
                    </span>
                    {isRunningOrDone && (
                      <>
                        <span className="text-green-600">{campaign.sentCount} enviados</span>
                        {campaign.failedCount > 0 && (
                          <span className="text-red-500">{campaign.failedCount} fallidos</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Message preview */}
                  {bodyComp?.text && (
                    <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 rounded-lg p-2">
                      {bodyComp.text}
                    </p>
                  )}

                  {/* Rejection reason */}
                  {isRejected && campaign.rejectionReason && (
                    <div className="rounded-lg bg-red-50 border border-red-100 p-2">
                      <p className="text-xs text-red-600">
                        <strong>{t("unifiedCampaign.rejectionReason")}:</strong> {campaign.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-[10px] text-slate-400">
                    {new Date(campaign.createdAt).toLocaleString()}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {isSendable && (
                      <button
                        onClick={() => sendMutation.mutate(campaign.id)}
                        disabled={sendMutation.isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {t("unifiedCampaign.send")}
                      </button>
                    )}
                    {isRejected && (
                      <button
                        onClick={() => {
                          setShowForm(true);
                          if (bodyComp?.text) setBodyText(bodyComp.text);
                          if (campaign.templateName) setTemplateName(campaign.templateName + "_v2");
                          if (campaign.contacts) setParsedExcel({
                            columns: Object.keys(campaign.contacts[0] || {}),
                            rows: campaign.contacts,
                            phoneColumn: "phone",
                            totalRows: campaign.contacts.length,
                          });
                        }}
                        className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        {t("unifiedCampaign.editAndResubmit")}
                      </button>
                    )}
                    {!isRunningOrDone && (
                      <button
                        onClick={() => {
                          if (confirm(t("unifiedCampaign.deleteConfirm"))) deleteMutation.mutate(campaign.id);
                        }}
                        className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </DashboardCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
