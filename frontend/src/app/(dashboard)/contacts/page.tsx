"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse, Contact, ApiResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Upload,
  Trash2,
  FileSpreadsheet,
  X,
  Users,
  List,
  Eye,
  Download,
} from "lucide-react";

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  phones?: string[];
}

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ContactListWithMembers extends ContactList {
  members: { id: string; phone: string; name: string | null; createdAt: string }[];
}

type Tab = "contacts" | "lists";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("contacts");

  // --- Contacts state ---
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ phone: "", name: "", email: "", tags: "" });
  const [importTags, setImportTags] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Lists state ---
  const [showCreateList, setShowCreateList] = useState(false);
  const [listName, setListName] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [listPhones, setListPhones] = useState("");
  const [viewingList, setViewingList] = useState<string | null>(null);
  const listFileRef = useRef<HTMLInputElement>(null);
  const [listUploading, setListUploading] = useState(false);

  // --- Contacts queries ---
  const { data, isLoading } = useQuery({
    queryKey: ["contacts", page, search],
    queryFn: () =>
      api.get<PaginatedResponse<Contact>>(`/contacts?page=${page}&limit=20&search=${search}`),
  });

  // --- Lists queries ---
  const { data: listsData, isLoading: listsLoading } = useQuery({
    queryKey: ["contact-lists"],
    queryFn: () => api.get<{ success: boolean; data: ContactList[] }>("/contact-lists"),
  });

  const { data: listDetailData } = useQuery({
    queryKey: ["contact-list-detail", viewingList],
    queryFn: () => api.get<{ success: boolean; data: ContactListWithMembers }>(`/contact-lists/${viewingList}`),
    enabled: !!viewingList,
  });

  const lists = listsData?.data || [];
  const viewedList = listDetailData?.data;

  // --- Contacts mutations ---
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post<ApiResponse<Contact>>("/contacts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowCreate(false);
      setForm({ phone: "", name: "", email: "", tags: "" });
      toast.success("Contacto creado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contacto eliminado");
    },
  });

  // --- Lists mutations ---
  const createListMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; phones: { phone: string; name?: string }[] }) =>
      api.post("/contact-lists", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      setShowCreateList(false);
      setListName("");
      setListDescription("");
      setListPhones("");
      toast.success("Lista creada");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contact-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      if (viewingList) setViewingList(null);
      toast.success("Lista eliminada");
    },
  });

  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (importTags.trim()) formData.append("tags", importTags.trim());

      const res = await fetch("/api/contacts/import-excel", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al importar");

      const result = json.data as ImportResult;
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`${result.imported} contactos importados`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Excel upload for lists - extract phones and put in textarea
  async function handleListExcelUpload(file: File) {
    setListUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/contacts/import-excel", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al leer archivo");

      const phones: string[] = json.data.phones || [];
      if (phones.length > 0) {
        setListPhones((prev) => {
          const existing = prev.trim();
          return existing ? `${existing}\n${phones.join("\n")}` : phones.join("\n");
        });
        toast.success(`${phones.length} numeros extraidos del archivo`);
      } else {
        toast.error("No se encontraron numeros en el archivo");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setListUploading(false);
      if (listFileRef.current) listFileRef.current.value = "";
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      phone: form.phone,
      name: form.name || undefined,
      email: form.email || undefined,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
    });
  }

  function handleCreateList() {
    if (!listName.trim()) return toast.error("Nombre de lista es obligatorio");
    const lines = listPhones.split(/[,\n\r;]+/).map((l) => l.trim()).filter(Boolean);
    const phones = lines.map((line) => {
      // Support "phone name" or "phone,name" or just "phone"
      const parts = line.split(/\t/).map((p) => p.trim());
      return {
        phone: parts[0].replace(/[^0-9]/g, ""),
        name: parts[1] || undefined,
      };
    }).filter((p) => p.phone.length >= 10);

    if (phones.length === 0) return toast.error("No hay numeros validos");
    createListMutation.mutate({ name: listName, description: listDescription || undefined, phones });
  }

  function downloadListCsv(list: ContactListWithMembers) {
    const csv = "phone,name\n" + list.members.map((m) => `${m.phone},${m.name || ""}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const contacts = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contactos</h1>
          <p className="text-muted-foreground">Gestiona contactos y listas para envios masivos</p>
        </div>
        <div className="flex gap-2">
          {tab === "contacts" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setShowImport(!showImport); setShowCreate(false); }}>
                <Upload className="mr-2 h-4 w-4" />
                Importar Excel
              </Button>
              <Button size="sm" onClick={() => { setShowCreate(!showCreate); setShowImport(false); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Contacto
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => { setShowCreateList(true); setViewingList(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Lista
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab("contacts")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "contacts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="inline h-4 w-4 mr-2" />
          Contactos
        </button>
        <button
          onClick={() => setTab("lists")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "lists"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="inline h-4 w-4 mr-2" />
          Listas
          {lists.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">{lists.length}</Badge>
          )}
        </button>
      </div>

      {/* ===== CONTACTS TAB ===== */}
      {tab === "contacts" && (
        <>
          {showImport && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Importar desde Excel
                </CardTitle>
                <CardDescription>
                  El archivo debe tener columnas: <strong>phone/telefono</strong> (obligatorio), name/nombre, email/correo, tags/etiquetas.
                  <br />
                  Cualquier columna extra se guarda como variable para usar en mensajes con {"{{nombre_columna}}"}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Tags para todos los importados (opcional, separados por coma)"
                  value={importTags}
                  onChange={(e) => setImportTags(e.target.value)}
                />
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="text-sm"
                  />
                  {uploading && <span className="text-sm text-muted-foreground">Importando...</span>}
                </div>
                {importResult && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div><p className="text-2xl font-bold">{importResult.imported}</p><p className="text-xs text-muted-foreground">Importados</p></div>
                      <div><p className="text-2xl font-bold">{importResult.skipped}</p><p className="text-xs text-muted-foreground">Omitidos</p></div>
                      <div><p className="text-2xl font-bold">{importResult.total}</p><p className="text-xs text-muted-foreground">Total filas</p></div>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-destructive space-y-1">
                        {importResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                      </div>
                    )}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => { setShowImport(false); setImportResult(null); }}>
                  <X className="mr-1 h-4 w-4" /> Cerrar
                </Button>
              </CardContent>
            </Card>
          )}

          {showCreate && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Nuevo Contacto</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
                  <Input placeholder="Telefono (ej: 573001234567)" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
                  <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  <Input placeholder="Tags (separados por coma)" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creando..." : "Crear Contacto"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar contactos..." className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            {pagination && <p className="text-sm text-muted-foreground">{pagination.total} contactos</p>}
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Telefono</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tags</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Variables</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Cargando...</td></tr>
                  ) : contacts.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hay contactos. Crea uno o importa desde Excel.</td></tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{contact.name || "-"}</td>
                        <td className="px-4 py-3 text-sm font-mono">{contact.phone}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{contact.email || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {contact.tags?.map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {contact.metadata && Object.keys(contact.metadata).length > 0
                            ? Object.entries(contact.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(contact.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <span className="text-sm text-muted-foreground">Pagina {page} de {pagination.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ===== LISTS TAB ===== */}
      {tab === "lists" && (
        <>
          {/* Create List Form */}
          {showCreateList && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nueva Lista de Contactos</CardTitle>
                <CardDescription>
                  Asigna un nombre y carga los numeros. Puedes pegarlos o importarlos desde Excel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Nombre de la lista (ej: Clientes VIP, Promo Marzo)"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                  />
                  <Input
                    placeholder="Descripcion (opcional)"
                    value={listDescription}
                    onChange={(e) => setListDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Numeros de telefono</label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={"Pega los numeros separados por coma o Enter\nEj: 573001234567\n573112233445"}
                    rows={8}
                    value={listPhones}
                    onChange={(e) => setListPhones(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {listPhones
                        .split(/[,\n\r;]+/)
                        .map((n) => n.replace(/[^0-9]/g, "").trim())
                        .filter((n) => n.length >= 10).length} numeros detectados
                    </p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => listFileRef.current?.click()}>
                        <FileSpreadsheet className="mr-1 h-4 w-4" />
                        Desde Excel
                      </Button>
                      <input
                        ref={listFileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleListExcelUpload(file);
                        }}
                      />
                    </div>
                  </div>
                  {listUploading && <p className="text-xs text-muted-foreground mt-1">Extrayendo numeros...</p>}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowCreateList(false); setListName(""); setListDescription(""); setListPhones(""); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateList} disabled={createListMutation.isPending}>
                    {createListMutation.isPending ? "Creando..." : "Crear Lista"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Viewing a list */}
          {viewingList && viewedList && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{viewedList.name}</CardTitle>
                    {viewedList.description && (
                      <CardDescription>{viewedList.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => downloadListCsv(viewedList)}>
                      <Download className="mr-1 h-4 w-4" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setViewingList(null)}>
                      <X className="mr-1 h-4 w-4" /> Cerrar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">#</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Telefono</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Nombre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewedList.members.map((m, i) => (
                        <tr key={m.id} className="border-b">
                          <td className="px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2 text-sm font-mono">{m.phone}</td>
                          <td className="px-4 py-2 text-sm">{m.name || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lists grid */}
          {listsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent>
                </Card>
              ))}
            </div>
          ) : lists.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <List className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-lg font-medium">No hay listas</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crea tu primera lista de contactos para usar en envios masivos
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map((list) => (
                <Card key={list.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{list.name}</h3>
                        {list.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{list.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setViewingList(list.id); setShowCreateList(false); }}
                          title="Ver contactos"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteListMutation.mutate(list.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">{list.contactCount}</span>
                        <span className="text-muted-foreground">contactos</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(list.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
