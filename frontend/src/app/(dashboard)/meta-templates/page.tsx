"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { getSessionColor } from "@/lib/session-colors";
import { TemplateWizard } from "@/components/templates/template-wizard";

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
  sessionNumbers?: string[];
}

interface WhatsAppSession {
  id: string;
  name: string;
  phone?: string;
  status: string;
  connectionType?: string;
}

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

  // Si la sesión elegida ya no existe (se eliminó/reconectó), no seguir
  // apuntando a ella en silencio.
  useEffect(() => {
    if (sessionId && metaSessions.length > 0 && !metaSessions.some((s) => s.id === sessionId)) {
      setSessionId("");
    }
  }, [metaSessions, sessionId]);

  // Vista general: todas las plantillas de todos los números conectados,
  // sin importar cuál esté seleccionado en el selector de arriba (ese solo
  // se usa para elegir a qué número Crear/Sincronizar).
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["meta-templates", "all"],
    queryFn: () => api.get<{ success: boolean; data: MetaTemplate[] }>("/meta-templates"),
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
          {/* Create wizard */}
          {showCreate && (
            <TemplateWizard
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
                <table className="w-full min-w-[820px]">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        {t("metaTemplates.colName")}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        {t("metaTemplates.colNumber")}
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
                          className="border-b hover:bg-muted/30 transition-colors group cursor-pointer"
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
                            {tpl.sessionNumbers && tpl.sessionNumbers.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {tpl.sessionNumbers.map((num, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px]">
                                    {num}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
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
