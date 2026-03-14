"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Copy,
  FileText,
  X,
  Check,
  FolderOpen,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  content: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", content: "", category: "" });

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["templates", search, filterCategory],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCategory) params.set("category", filterCategory);
      return api.get<{ success: boolean; data: Template[] }>(`/templates?${params}`);
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["template-categories"],
    queryFn: () => api.get<{ success: boolean; data: string[] }>("/templates/categories"),
  });

  const templates = templatesData?.data || [];
  const categories = categoriesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: { name: string; content: string; category?: string }) =>
      api.post("/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-categories"] });
      setShowCreate(false);
      setForm({ name: "", content: "", category: "" });
      toast.success("Plantilla creada");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; content: string; category?: string }) =>
      api.put(`/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-categories"] });
      setEditingId(null);
      setForm({ name: "", content: "", category: "" });
      toast.success("Plantilla actualizada");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-categories"] });
      toast.success("Plantilla eliminada");
    },
  });

  function startEdit(template: Template) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      content: template.content,
      category: template.category || "",
    });
    setShowCreate(false);
  }

  function handleSave() {
    if (!form.name.trim() || !form.content.trim()) {
      return toast.error("Nombre y contenido son obligatorios");
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  function copyContent(content: string) {
    navigator.clipboard.writeText(content);
    toast.success("Contenido copiado al portapapeles");
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold">Plantillas</h1>
          <p className="text-muted-foreground">Guarda mensajes frecuentes para reutilizar en envios masivos</p>
        </div>
        <Button
          onClick={() => {
            setShowCreate(true);
            setEditingId(null);
            setForm({ name: "", content: "", category: "" });
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Create / Edit Form */}
      {(showCreate || editingId) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingId ? "Editar Plantilla" : "Nueva Plantilla"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Nombre de la plantilla"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Categoria (opcional, ej: Promociones, Soporte)"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <Textarea
              placeholder={"Escribe el contenido del mensaje...\n\nPuedes usar variables: {{name}}, {{phone}}, {{email}}, etc."}
              rows={6}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="resize-none"
            />
            {form.content && (
              <div className="flex gap-2 flex-wrap">
                {form.content.match(/\{\{(\w+)\}\}/g)?.map((v, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setEditingId(null);
                  setForm({ name: "", content: "", category: "" });
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Check className="mr-1 h-4 w-4" />
                {isSaving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar plantillas..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !filterCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat === filterCategory ? "" : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground ml-auto">
          {templates.length} plantilla{templates.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Templates Table */}
      {isLoading ? (
        <Card><CardContent className="p-6"><div className="h-32 bg-muted rounded animate-pulse" /></CardContent></Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">No hay plantillas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primera plantilla para reutilizar mensajes frecuentes
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Nombre</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Contenido</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Categoria</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-2.5 text-sm font-medium whitespace-nowrap">{template.name}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground max-w-md">
                      <p className="truncate">{template.content}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {template.category ? (
                        <Badge variant="outline" className="text-[10px]">
                          <FolderOpen className="h-2.5 w-2.5 mr-1" />
                          {template.category}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(template.updatedAt).toLocaleDateString("es", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex gap-0.5 justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyContent(template.content)} title="Copiar">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(template)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(template.id)} title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
