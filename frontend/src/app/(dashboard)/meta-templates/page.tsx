"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import {
  RefreshCw,
  FileText,
  Eye,
  X,
  Search,
  Filter,
  Smartphone,
  ChevronDown,
  MessageSquareText,
  Type,
  MousePointerClick,
  AlignLeft,
  Plus,
  Trash2,
  Check,
  Link as LinkIcon,
  MessageCircle,
  Image,
  Video,
  File,
  Phone,
} from "lucide-react";
import { getSessionColor } from "@/lib/session-colors";

interface MetaTemplate {
  id: string;
  wabaId: string;
  metaTemplateId: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: any[];
  lastSyncedAt: string;
  createdAt: string;
}

interface WhatsAppSession {
  id: string;
  name: string;
  phone?: string;
  status: string;
  connectionType?: string;
}

interface TemplateButton {
  type: "URL" | "QUICK_REPLY" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
}

type HeaderFormat = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  DISABLED: "bg-gray-100 text-gray-500 border-gray-200",
};

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: "bg-purple-100 text-purple-700 border-purple-200",
  UTILITY: "bg-blue-100 text-blue-700 border-blue-200",
  AUTHENTICATION: "bg-orange-100 text-orange-700 border-orange-200",
};

const COMPONENT_ICONS: Record<string, typeof Type> = {
  HEADER: Type,
  BODY: AlignLeft,
  FOOTER: MessageSquareText,
  BUTTONS: MousePointerClick,
};

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"] as const;
const LANGUAGES = [
  { code: "es", label: "Espanol (es)" },
  { code: "en_US", label: "English (en_US)" },
  { code: "pt_BR", label: "Portugues (pt_BR)" },
] as const;

const INITIAL_FORM = {
  name: "",
  category: "MARKETING" as string,
  language: "es" as string,
  headerFormat: "NONE" as HeaderFormat,
  headerText: "",
  headerMediaUrl: "",
  bodyText: "",
  footerText: "",
  buttons: [] as TemplateButton[],
};

function ComponentPreview({ component }: { component: any }) {
  const Icon = COMPONENT_ICONS[component.type] || FileText;

  if (component.type === "HEADER") {
    return (
      <div className="rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" />
          Header
          {component.format && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {component.format}
            </Badge>
          )}
        </div>
        {component.text && <p className="text-sm">{component.text}</p>}
        {component.example?.header_text && (
          <p className="text-xs text-muted-foreground mt-1">
            Ej: {component.example.header_text.join(", ")}
          </p>
        )}
      </div>
    );
  }

  if (component.type === "BODY") {
    const params = component.text?.match(/\{\{\d+\}\}/g) || [];
    return (
      <div className="rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" />
          Body
          {params.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {params.length} param{params.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap">{component.text}</p>
        {component.example?.body_text?.[0] && (
          <p className="text-xs text-muted-foreground mt-1">
            Ej: {component.example.body_text[0].join(", ")}
          </p>
        )}
      </div>
    );
  }

  if (component.type === "FOOTER") {
    return (
      <div className="rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" />
          Footer
        </div>
        <p className="text-xs text-muted-foreground">{component.text}</p>
      </div>
    );
  }

  if (component.type === "BUTTONS") {
    return (
      <div className="rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" />
          Buttons
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {component.buttons?.map((btn: any, i: number) => (
            <Badge key={i} variant="outline" className="text-xs">
              {btn.text}
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({btn.type})
              </span>
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function CreateTemplateForm({
  sessionId,
  onClose,
  onSuccess,
}: {
  sessionId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const nameError = form.name && !/^[a-z0-9_]*$/.test(form.name);

  const updateForm = useCallback(
    <K extends keyof typeof INITIAL_FORM>(key: K, value: (typeof INITIAL_FORM)[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const addButton = useCallback(() => {
    if (form.buttons.length >= 3) return;
    setForm((prev) => ({
      ...prev,
      buttons: [...prev.buttons, { type: "QUICK_REPLY", text: "" }],
    }));
  }, [form.buttons.length]);

  const updateButton = useCallback((index: number, updates: Partial<TemplateButton>) => {
    setForm((prev) => ({
      ...prev,
      buttons: prev.buttons.map((b, i) => (i === index ? { ...b, ...updates } : b)),
    }));
  }, []);

  const removeButton = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index),
    }));
  }, []);

  const createMutation = useMutation({
    mutationFn: () => {
      const components: any[] = [];

      if (form.headerFormat === "TEXT" && form.headerText.trim()) {
        components.push({ type: "HEADER", format: "TEXT", text: form.headerText.trim() });
      } else if (form.headerFormat === "IMAGE" && form.headerMediaUrl.trim()) {
        components.push({
          type: "HEADER",
          format: "IMAGE",
          example: { header_handle: [form.headerMediaUrl.trim()] },
        });
      } else if (form.headerFormat === "VIDEO" && form.headerMediaUrl.trim()) {
        components.push({
          type: "HEADER",
          format: "VIDEO",
          example: { header_handle: [form.headerMediaUrl.trim()] },
        });
      } else if (form.headerFormat === "DOCUMENT" && form.headerMediaUrl.trim()) {
        components.push({
          type: "HEADER",
          format: "DOCUMENT",
          example: { header_handle: [form.headerMediaUrl.trim()] },
        });
      }

      components.push({ type: "BODY", text: form.bodyText.trim() });

      if (form.footerText.trim()) {
        components.push({ type: "FOOTER", text: form.footerText.trim() });
      }

      const validButtons = form.buttons.filter((b) => b.text.trim());
      if (validButtons.length > 0) {
        components.push({
          type: "BUTTONS",
          buttons: validButtons.map((b) => {
            if (b.type === "URL") {
              return { type: "URL", text: b.text.trim(), url: b.url?.trim() || "" };
            }
            if (b.type === "PHONE_NUMBER") {
              return { type: "PHONE_NUMBER", text: b.text.trim(), phone_number: b.phone_number?.trim() || "" };
            }
            return { type: "QUICK_REPLY", text: b.text.trim() };
          }),
        });
      }

      return api.post("/meta-templates/create", {
        sessionId,
        name: form.name.trim(),
        category: form.category,
        language: form.language,
        components,
      });
    },
    onSuccess: () => {
      toast.success(t("metaTemplates.createSuccess"));
      onSuccess();
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const canSubmit =
    form.name.trim() &&
    !nameError &&
    form.bodyText.trim() &&
    !createMutation.isPending;

  const bodyParams = form.bodyText.match(/\{\{\d+\}\}/g) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("metaTemplates.newTemplate")}</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: Name, Category, Language */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("metaTemplates.formName")}
            </label>
            <Input
              placeholder="mi_plantilla"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className={nameError ? "border-red-500" : ""}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {t("metaTemplates.nameHint")}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("metaTemplates.formCategory")}
            </label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => updateForm("category", e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("metaTemplates.formLanguage")}
            </label>
            <div className="relative">
              <select
                value={form.language}
                onChange={(e) => updateForm("language", e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Header (optional) */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Header <span className="text-muted-foreground font-normal">({t("metaTemplates.optional")})</span>
          </label>
          <div className="flex gap-2 mb-2">
            {(["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"] as const).map((fmt) => {
              const icons: Record<string, typeof Type> = { TEXT: Type, IMAGE: Image, VIDEO: Video, DOCUMENT: File };
              const FmtIcon = icons[fmt];
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, headerFormat: fmt, headerText: "", headerMediaUrl: "" }));
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                    form.headerFormat === fmt
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {FmtIcon && <FmtIcon className="h-3 w-3" />}
                  {fmt === "NONE" ? t("metaTemplates.headerNone") : fmt}
                </button>
              );
            })}
          </div>
          {form.headerFormat === "TEXT" && (
            <>
              <Input
                placeholder={t("metaTemplates.headerPlaceholder")}
                value={form.headerText}
                onChange={(e) => updateForm("headerText", e.target.value)}
                maxLength={60}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                {form.headerText.length}/60
              </p>
            </>
          )}
          {(form.headerFormat === "IMAGE" || form.headerFormat === "VIDEO" || form.headerFormat === "DOCUMENT") && (
            <>
              <div className="flex items-center gap-1.5">
                {form.headerFormat === "IMAGE" && <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                {form.headerFormat === "VIDEO" && <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                {form.headerFormat === "DOCUMENT" && <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <Input
                  placeholder={t("metaTemplates.mediaUrlPlaceholder")}
                  value={form.headerMediaUrl}
                  onChange={(e) => updateForm("headerMediaUrl", e.target.value)}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {t("metaTemplates.mediaUrlHint")}
              </p>
            </>
          )}
        </div>

        {/* Body (required) */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Body <span className="text-red-500">*</span>
          </label>
          <Textarea
            placeholder={t("metaTemplates.bodyPlaceholder")}
            rows={4}
            value={form.bodyText}
            onChange={(e) => updateForm("bodyText", e.target.value)}
            className="resize-none"
            maxLength={1024}
          />
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex gap-1.5">
              {bodyParams.length > 0 &&
                bodyParams.map((p, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {p}
                  </Badge>
                ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {form.bodyText.length}/1024
            </p>
          </div>
        </div>

        {/* Footer (optional) */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Footer <span className="text-muted-foreground font-normal">({t("metaTemplates.optional")})</span>
          </label>
          <Input
            placeholder={t("metaTemplates.footerPlaceholder")}
            value={form.footerText}
            onChange={(e) => updateForm("footerText", e.target.value)}
            maxLength={60}
          />
          <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
            {form.footerText.length}/60
          </p>
        </div>

        {/* Buttons (optional) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t("metaTemplates.buttons")} <span className="text-muted-foreground font-normal">({t("metaTemplates.optional")}, max 3)</span>
            </label>
            {form.buttons.length < 3 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={addButton}>
                <Plus className="h-3 w-3 mr-1" />
                {t("metaTemplates.addButton")}
              </Button>
            )}
          </div>
          {form.buttons.length > 0 && (
            <div className="space-y-2">
              {form.buttons.map((btn, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border p-2.5">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="relative w-40">
                        <select
                          value={btn.type}
                          onChange={(e) => updateButton(i, { type: e.target.value as TemplateButton["type"], url: "", phone_number: "" })}
                          className="h-8 w-full rounded-md border bg-background px-2 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="QUICK_REPLY">{t("metaTemplates.quickReply")}</option>
                          <option value="URL">URL</option>
                          <option value="PHONE_NUMBER">{t("metaTemplates.phoneNumber")}</option>
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                      <Input
                        placeholder={t("metaTemplates.buttonText")}
                        value={btn.text}
                        onChange={(e) => updateButton(i, { text: e.target.value })}
                        className="h-8 text-xs flex-1"
                        maxLength={25}
                      />
                    </div>
                    {btn.type === "URL" && (
                      <div className="flex items-center gap-1.5">
                        <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Input
                          placeholder="https://ejemplo.com/{{1}}"
                          value={btn.url || ""}
                          onChange={(e) => updateButton(i, { url: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    {btn.type === "PHONE_NUMBER" && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Input
                          placeholder="+573001234567"
                          value={btn.phone_number || ""}
                          onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => removeButton(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live preview */}
        {(form.headerFormat !== "NONE" || form.bodyText || form.footerText || form.buttons.length > 0) && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("metaTemplates.livePreview")}
            </label>
            <div className="rounded-xl border bg-[#e5ddd5] dark:bg-[#1a1a2e] p-4">
              <div className="max-w-[320px] mx-auto rounded-lg bg-white dark:bg-[#202c33] overflow-hidden shadow-sm">
                {/* Media header preview */}
                {form.headerFormat === "IMAGE" && (
                  <div className="bg-muted/60 flex items-center justify-center h-40">
                    {form.headerMediaUrl ? (
                      <img src={form.headerMediaUrl} alt="Header" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Image className="h-10 w-10 text-muted-foreground/40" />
                    )}
                  </div>
                )}
                {form.headerFormat === "VIDEO" && (
                  <div className="bg-muted/60 flex items-center justify-center h-40">
                    <Video className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                {form.headerFormat === "DOCUMENT" && (
                  <div className="bg-muted/60 flex items-center justify-center h-16">
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <File className="h-6 w-6" />
                      <span className="text-xs">document.pdf</span>
                    </div>
                  </div>
                )}
                <div className="p-3 space-y-1.5">
                  {form.headerFormat === "TEXT" && form.headerText && (
                    <p className="text-sm font-semibold">{form.headerText}</p>
                  )}
                  {form.bodyText && (
                    <p className="text-sm whitespace-pre-wrap">{form.bodyText}</p>
                  )}
                  {form.footerText && (
                    <p className="text-[11px] text-muted-foreground">{form.footerText}</p>
                  )}
                </div>
                {form.buttons.filter((b) => b.text.trim()).length > 0 && (
                  <div className="border-t px-3 pb-2 pt-1.5 space-y-1">
                    {form.buttons
                      .filter((b) => b.text.trim())
                      .map((btn, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center gap-1.5 py-1 text-xs text-blue-500 font-medium"
                        >
                          {btn.type === "URL" && <LinkIcon className="h-3 w-3" />}
                          {btn.type === "PHONE_NUMBER" && <Phone className="h-3 w-3" />}
                          {btn.type === "QUICK_REPLY" && <MessageCircle className="h-3 w-3" />}
                          {btn.text}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1 h-4 w-4" />
            {t("common.cancel")}
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={!canSubmit}>
            {createMutation.isPending ? (
              <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            {createMutation.isPending
              ? t("metaTemplates.creating")
              : t("metaTemplates.createBtn")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MetaTemplatesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [sessionId, setSessionId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [previewTemplate, setPreviewTemplate] = useState<MetaTemplate | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () =>
      api.get<{ success: boolean; data: WhatsAppSession[] }>("/whatsapp/sessions"),
  });

  const metaSessions = useMemo(
    () => (sessionsData?.data || []).filter((s) => s.connectionType === "meta_cloud"),
    [sessionsData]
  );

  const activeSessionId = sessionId || metaSessions[0]?.id || "";
  const activeSessionColor = getSessionColor(activeSessionId);
  const activeSession = metaSessions.find((s) => s.id === activeSessionId);

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["meta-templates", activeSessionId],
    queryFn: () =>
      api.get<{ success: boolean; data: MetaTemplate[] }>(
        `/meta-templates?sessionId=${activeSessionId}`
      ),
    enabled: !!activeSessionId,
  });

  const allTemplates = templatesData?.data || [];

  const syncMutation = useMutation({
    mutationFn: () => api.post("/meta-templates/sync", { sessionId: activeSessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-templates"] });
      toast.success(t("campaigns.templatesSynced"));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    let list = allTemplates;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (tpl) =>
          tpl.name.toLowerCase().includes(q) ||
          tpl.language.toLowerCase().includes(q)
      );
    }
    if (filterStatus) {
      list = list.filter((tpl) => tpl.status === filterStatus);
    }
    if (filterCategory) {
      list = list.filter((tpl) => tpl.category === filterCategory);
    }
    return list;
  }, [allTemplates, search, filterStatus, filterCategory]);

  const categories = useMemo(
    () => [...new Set(allTemplates.map((tpl) => tpl.category))].sort(),
    [allTemplates]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tpl of allTemplates) {
      counts[tpl.status] = (counts[tpl.status] || 0) + 1;
    }
    return counts;
  }, [allTemplates]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold">
            {t("metaTemplates.title")}
          </h1>
          <p className="text-muted-foreground">{t("metaTemplates.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Session selector */}
          <div className="relative">
            {activeSession ? (
              <span className={`absolute left-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${activeSessionColor.dot}`} />
            ) : (
              <Smartphone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            )}
            <select
              value={activeSessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="h-9 rounded-md border bg-background pl-8 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {metaSessions.length === 0 && (
                <option value="">{t("metaTemplates.noMetaSessions")}</option>
              )}
              {metaSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          <Button
            onClick={() => syncMutation.mutate()}
            disabled={!activeSessionId || syncMutation.isPending}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            {t("metaTemplates.sync")}
          </Button>

          <Button
            onClick={() => { setShowCreate(true); }}
            disabled={!activeSessionId}
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("metaTemplates.newTemplate")}
          </Button>
        </div>
      </div>

      {/* No Meta sessions */}
      {metaSessions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("metaTemplates.noMetaSessions")}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {t("metaTemplates.connectFirst")}
            </p>
          </CardContent>
        </Card>
      )}

      {metaSessions.length > 0 && (
        <>
          {/* Create form */}
          {showCreate && (
            <CreateTemplateForm
              sessionId={activeSessionId}
              onClose={() => setShowCreate(false)}
              onSuccess={() =>
                queryClient.invalidateQueries({ queryKey: ["meta-templates"] })
              }
            />
          )}

          {/* Status summary cards */}
          {allTemplates.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["APPROVED", "PENDING", "REJECTED"] as const).map((status) => (
                <Card
                  key={status}
                  className={`cursor-pointer transition-all ${
                    filterStatus === status
                      ? "ring-2 ring-primary"
                      : "hover:shadow-md"
                  }`}
                  onClick={() =>
                    setFilterStatus((prev) => (prev === status ? "" : status))
                  }
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {statusCounts[status] || 0}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${STATUS_COLORS[status] || ""}`}
                      >
                        {status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {allTemplates.length}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      TOTAL
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("metaTemplates.searchPlaceholder")}
                className="h-9 w-full rounded-md border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilterCategory("")}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      !filterCategory
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {t("metaTemplates.all")}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setFilterCategory((prev) => (prev === cat ? "" : cat))
                      }
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        filterCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground ml-auto">
              {filtered.length} {t("metaTemplates.of")} {allTemplates.length}
            </p>
          </div>

          {/* Templates table */}
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">{t("metaTemplates.noTemplates")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {allTemplates.length === 0
                    ? t("metaTemplates.syncToLoad")
                    : t("metaTemplates.noMatch")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        {t("metaTemplates.colName")}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        {t("metaTemplates.colCategory")}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        {t("metaTemplates.colLanguage")}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        {t("metaTemplates.colStatus")}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        {t("metaTemplates.colComponents")}
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        {t("metaTemplates.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tpl) => {
                      const bodyComp = tpl.components?.find(
                        (c: any) => c.type === "BODY"
                      );
                      const paramCount =
                        bodyComp?.text?.match(/\{\{\d+\}\}/g)?.length || 0;
                      return (
                        <tr
                          key={tpl.id}
                          className={`border-b border-l-4 ${activeSessionColor.border} hover:bg-muted/30 transition-colors group cursor-pointer`}
                          onClick={() => setPreviewTemplate(tpl)}
                        >
                          <td className="px-4 py-2.5">
                            <p className="text-sm font-medium">{tpl.name}</p>
                            {bodyComp?.text && (
                              <p className="text-xs text-muted-foreground truncate max-w-[250px] mt-0.5">
                                {bodyComp.text}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${CATEGORY_COLORS[tpl.category] || ""}`}
                            >
                              {tpl.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-sm">
                            {tpl.language}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${STATUS_COLORS[tpl.status] || ""}`}
                            >
                              {tpl.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              {(tpl.components || []).map((c: any, i: number) => {
                                const CI = COMPONENT_ICONS[c.type] || FileText;
                                return (
                                  <span
                                    key={i}
                                    className="inline-flex items-center justify-center h-5 w-5 rounded bg-muted"
                                    title={c.type}
                                  >
                                    <CI className="h-3 w-3 text-muted-foreground" />
                                  </span>
                                );
                              })}
                              {paramCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 ml-1"
                                >
                                  {paramCount} var
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplate(tpl);
                              }}
                              title={t("metaTemplates.preview")}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Preview modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPreviewTemplate(null)}
          />
          <Card className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto z-10">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{previewTemplate.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${STATUS_COLORS[previewTemplate.status] || ""}`}
                    >
                      {previewTemplate.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${CATEGORY_COLORS[previewTemplate.category] || ""}`}
                    >
                      {previewTemplate.category}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {previewTemplate.language}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 -mt-1 -mr-1"
                  onClick={() => setPreviewTemplate(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(previewTemplate.components || []).map((comp: any, i: number) => (
                <ComponentPreview key={i} component={comp} />
              ))}
              {(!previewTemplate.components ||
                previewTemplate.components.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("metaTemplates.noComponents")}
                </p>
              )}
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <p>
                  ID: {previewTemplate.metaTemplateId}
                </p>
                <p>
                  {t("metaTemplates.lastSync")}:{" "}
                  {new Date(previewTemplate.lastSyncedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
