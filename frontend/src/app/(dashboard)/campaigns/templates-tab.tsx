"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription } from "@/components/ui/dashboard-card";

interface Template {
  id: string;
  name: string;
  content: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesTab() {
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Plantillas</h2>
          <p className="text-xs text-slate-400">Guarda mensajes frecuentes para reutilizar en envios masivos</p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setEditingId(null);
            setForm({ name: "", content: "", category: "" });
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Plantilla
        </button>
      </div>

      {/* Create / Edit Form */}
      {(showCreate || editingId) && (
        <DashboardCard>
          <DashboardCardHeader>
            <DashboardCardTitle>{editingId ? "Editar Plantilla" : "Nueva Plantilla"}</DashboardCardTitle>
          </DashboardCardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Nombre de la plantilla"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <input
                placeholder="Categoria (opcional, ej: Promociones, Soporte)"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <textarea
              placeholder={"Escribe el contenido del mensaje...\n\nPuedes usar variables: {{name}}, {{phone}}, {{email}}, etc."}
              rows={6}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            {form.content && (
              <div className="flex gap-2 flex-wrap">
                {form.content.match(/\{\{(\w+)\}\}/g)?.map((v, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-mono">{v}</span>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowCreate(false); setEditingId(null); setForm({ name: "", content: "", category: "" }); }}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all"
              >
                <X className="mr-1 h-4 w-4 inline" />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {isSaving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </DashboardCard>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Buscar plantillas..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
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
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 ml-auto">
          {templates.length} plantilla{templates.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Templates Table */}
      {isLoading ? (
        <DashboardCard>
          <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        </DashboardCard>
      ) : templates.length === 0 ? (
        <DashboardCard>
          <div className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="font-medium text-slate-800">No hay plantillas</p>
            <p className="text-xs text-slate-400 mt-1">Crea tu primera plantilla para reutilizar mensajes frecuentes</p>
          </div>
        </DashboardCard>
      ) : (
        <DashboardCard variant="table">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Contenido</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoria</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-800 whitespace-nowrap">{template.name}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-500 max-w-md">
                      <p className="truncate">{template.content}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {template.category ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600">
                          <FolderOpen className="h-3 w-3" />
                          {template.category}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(template.updatedAt).toLocaleDateString("es", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex gap-0.5 justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyContent(template.content)} className="h-7 w-7 rounded-xl flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all" title="Copiar">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => startEdit(template)} className="h-7 w-7 rounded-xl flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all" title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(template.id)} className="h-7 w-7 rounded-xl flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all" title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      )}
    </div>
  );
}
