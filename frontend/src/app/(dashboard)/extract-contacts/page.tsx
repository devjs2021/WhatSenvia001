"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { WhatsAppSession, ApiResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Upload,
  Loader2,
  RefreshCw,
} from "lucide-react";

type Tab = "groups" | "verify";

interface GroupInfo {
  id: string;
  subject: string;
  participantsCount: number;
}

interface ExtractedContact {
  phone: string;
  isAdmin: boolean;
}

interface VerifyResult {
  phone: string;
  exists: boolean;
  jid?: string;
}

export default function ExtractContactsPage() {
  const [tab, setTab] = useState<Tab>("groups");
  const [selectedSession, setSelectedSession] = useState("");

  // --- Groups tab state ---
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [extractedContacts, setExtractedContacts] = useState<ExtractedContact[]>([]);
  const [groupSearch, setGroupSearch] = useState("");

  // --- Verify tab state ---
  const [phonesText, setPhonesText] = useState("");
  const [verifyResults, setVerifyResults] = useState<VerifyResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch sessions
  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () =>
      api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });

  const sessions = sessionsData?.data || [];
  const connectedSessions = sessions.filter((s) => s.status === "connected");

  // Fetch groups
  const {
    data: groupsData,
    isLoading: groupsLoading,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["whatsapp-groups", selectedSession],
    queryFn: () =>
      api.get<GroupInfo[]>(`/whatsapp/sessions/${selectedSession}/groups`),
    enabled: !!selectedSession && tab === "groups",
  });

  const groups = groupsData || [];
  const filteredGroups = groups.filter((g) =>
    g.subject.toLowerCase().includes(groupSearch.toLowerCase())
  );

  // Extract contacts mutation
  const extractMutation = useMutation({
    mutationFn: (groupIds: string[]) =>
      api.post<ExtractedContact[]>(
        `/whatsapp/sessions/${selectedSession}/group-contacts`,
        { groupIds }
      ),
    onSuccess: (data) => {
      const contacts = Array.isArray(data) ? data : [];
      setExtractedContacts(contacts);
      toast.success(`${contacts.length} contactos extraidos`);
    },
    onError: (err: any) => toast.error(err.message || "Error al extraer contactos"),
  });

  // Verify numbers mutation
  const verifyMutation = useMutation({
    mutationFn: (phones: string[]) =>
      api.post<VerifyResult[]>(
        `/whatsapp/sessions/${selectedSession}/check-numbers`,
        { phones }
      ),
    onSuccess: (data) => {
      const results = Array.isArray(data) ? data : [];
      setVerifyResults(results);
      const valid = results.filter((r) => r.exists).length;
      toast.success(`${valid} de ${results.length} numeros son validos`);
    },
    onError: (err: any) => toast.error(err.message || "Error al verificar"),
  });

  function toggleGroup(groupId: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function toggleAllGroups() {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map((g) => g.id)));
    }
  }

  function handleExtract() {
    if (selectedGroups.size === 0) return toast.error("Selecciona al menos un grupo");
    extractMutation.mutate(Array.from(selectedGroups));
  }

  function handleVerify() {
    const phones = phonesText
      .split(/[\n,;]+/)
      .map((p) => p.trim().replace(/[^0-9]/g, ""))
      .filter((p) => p.length >= 10);
    if (phones.length === 0) return toast.error("No hay numeros validos para verificar");
    verifyMutation.mutate(phones);
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setPhonesText((prev) => (prev.trim() ? `${prev}\n${text}` : text));
        toast.success("Archivo cargado");
      }
    };
    reader.readAsText(file);
  }

  function downloadCsv(data: Array<Record<string, any>>, filename: string) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv =
      headers.join(",") +
      "\n" +
      data.map((row) => headers.map((h) => row[h] ?? "").join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Extraer Contactos</h1>
        <p className="text-muted-foreground">
          Extrae contactos desde grupos de WhatsApp o verifica numeros existentes
        </p>
      </div>

      {/* Session selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">Sesion WhatsApp:</label>
            <select
              className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedSession}
              onChange={(e) => {
                setSelectedSession(e.target.value);
                setExtractedContacts([]);
                setVerifyResults([]);
                setSelectedGroups(new Set());
              }}
            >
              <option value="">Seleccionar sesion...</option>
              {connectedSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone || "sin telefono"})
                </option>
              ))}
            </select>
            {connectedSessions.length === 0 && (
              <p className="text-sm text-destructive">
                No hay sesiones conectadas. Conecta una en la seccion WhatsApp.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab("groups")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "groups"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="inline h-4 w-4 mr-2" />
          Desde Grupos
        </button>
        <button
          onClick={() => setTab("verify")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "verify"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="inline h-4 w-4 mr-2" />
          Verificar Numeros
        </button>
      </div>

      {/* ===== GROUPS TAB ===== */}
      {tab === "groups" && (
        <div className="space-y-4">
          {!selectedSession ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-lg font-medium">Selecciona una sesion</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Elige una sesion conectada para cargar los grupos
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Controls */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar grupos..."
                    className="pl-10"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchGroups()}
                  disabled={groupsLoading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${groupsLoading ? "animate-spin" : ""}`} />
                  Cargar Grupos
                </Button>
                <Button
                  size="sm"
                  onClick={handleExtract}
                  disabled={selectedGroups.size === 0 || extractMutation.isPending}
                >
                  {extractMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Extraer Contactos ({selectedGroups.size})
                </Button>
              </div>

              {/* Groups list */}
              <Card>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left w-10">
                          <input
                            type="checkbox"
                            checked={filteredGroups.length > 0 && selectedGroups.size === filteredGroups.length}
                            onChange={toggleAllGroups}
                            className="rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Grupo</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Participantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupsLoading ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                            Cargando grupos...
                          </td>
                        </tr>
                      ) : filteredGroups.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                            {groups.length === 0
                              ? 'No hay grupos. Haz clic en "Cargar Grupos" para buscar.'
                              : "No se encontraron grupos con ese filtro."}
                          </td>
                        </tr>
                      ) : (
                        filteredGroups.map((group) => (
                          <tr
                            key={group.id}
                            className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => toggleGroup(group.id)}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedGroups.has(group.id)}
                                onChange={() => toggleGroup(group.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">{group.subject}</td>
                            <td className="px-4 py-3 text-right">
                              <Badge variant="secondary">{group.participantsCount}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {groups.length > 0 && (
                  <div className="border-t px-4 py-3 text-sm text-muted-foreground">
                    {groups.length} grupos encontrados - {selectedGroups.size} seleccionados
                  </div>
                )}
              </Card>

              {/* Extracted contacts results */}
              {extractedContacts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Contactos Extraidos ({extractedContacts.length})
                        </CardTitle>
                        <CardDescription>
                          {extractedContacts.filter((c) => c.isAdmin).length} administradores
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          downloadCsv(
                            extractedContacts.map((c) => ({
                              phone: c.phone,
                              isAdmin: c.isAdmin ? "Si" : "No",
                            })),
                            "contactos-extraidos.csv"
                          )
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full">
                        <thead className="border-b bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium">#</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Telefono</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Admin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extractedContacts.map((contact, i) => (
                            <tr key={contact.phone} className="border-b">
                              <td className="px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>
                              <td className="px-4 py-2 text-sm font-mono">{contact.phone}</td>
                              <td className="px-4 py-2">
                                {contact.isAdmin ? (
                                  <Badge variant="default" className="text-xs">Admin</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== VERIFY TAB ===== */}
      {tab === "verify" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verificar Numeros de WhatsApp</CardTitle>
              <CardDescription>
                Pega numeros de telefono (uno por linea) o carga un archivo CSV para verificar
                cuales tienen WhatsApp activo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={"Pega los numeros, uno por linea:\n573001234567\n573112233445\n521234567890"}
                rows={8}
                value={phonesText}
                onChange={(e) => setPhonesText(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {
                    phonesText
                      .split(/[\n,;]+/)
                      .map((p) => p.trim().replace(/[^0-9]/g, ""))
                      .filter((p) => p.length >= 10).length
                  }{" "}
                  numeros detectados
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Desde CSV
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPhonesText("");
                    setVerifyResults([]);
                  }}
                >
                  Limpiar
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={!selectedSession || verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Verificar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Verify results */}
          {verifyResults.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Resultados ({verifyResults.length})
                    </CardTitle>
                    <CardDescription>
                      <span className="text-green-600 font-medium">
                        {verifyResults.filter((r) => r.exists).length} validos
                      </span>
                      {" / "}
                      <span className="text-red-500 font-medium">
                        {verifyResults.filter((r) => !r.exists).length} invalidos
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadCsv(
                          verifyResults.map((r) => ({
                            phone: r.phone,
                            exists: r.exists ? "Si" : "No",
                          })),
                          "verificacion-numeros.csv"
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Todo
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        downloadCsv(
                          verifyResults
                            .filter((r) => r.exists)
                            .map((r) => ({ phone: r.phone })),
                          "numeros-validos.csv"
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Solo Validos
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">#</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Telefono</th>
                        <th className="px-4 py-2 text-center text-sm font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifyResults.map((result, i) => (
                        <tr key={`${result.phone}-${i}`} className="border-b">
                          <td className="px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2 text-sm font-mono">{result.phone}</td>
                          <td className="px-4 py-2 text-center">
                            {result.exists ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 inline" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 inline" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
