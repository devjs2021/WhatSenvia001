"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  AlertTriangle,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription } from "@/components/ui/dashboard-card";

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: number;
  total: number;
  errorDetails?: string[];
}

export default function ImportPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [tag, setTag] = useState("");

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post<{ success: boolean; data: ImportResult }>("/contacts/import", formData);
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`${data.imported} contactos importados`);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls", "txt"].includes(ext || "")) {
      toast.error("Formato no soportado. Usa CSV, XLSX o TXT");
      return;
    }
    setFile(selectedFile);
    setResult(null);
  };

  const handleSubmit = () => {
    if (!file) {
      toast.error("Selecciona un archivo primero");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    if (tag.trim()) formData.append("tag", tag.trim());
    importMutation.mutate(formData);
  };

  const downloadTemplate = () => {
    const csv = "Telefono,Nombre,Email,Etiqueta\n573001234567,Juan Perez,juan@email.com,clientes\n573001234568,Maria Garcia,maria@email.com,clientes\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_importacion.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Plantilla descargada");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <DashboardHeader
        title={
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Contactos
          </div>
        }
        description="Sube un archivo CSV, XLSX o TXT con tus contactos"
      >
        <button
          onClick={downloadTemplate}
          className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Descargar Plantilla
        </button>
      </DashboardHeader>

      {/* Upload area */}
      <DashboardCard>
        <DashboardCardHeader>
          <DashboardCardTitle>Subir Archivo</DashboardCardTitle>
          <DashboardCardDescription>
            Formatos aceptados: CSV, XLSX, TXT. Maximo 10MB.
          </DashboardCardDescription>
        </DashboardCardHeader>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-colors ${
            dragOver ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          {file ? (
            <div className="space-y-2">
              <FileSpreadsheet className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="font-display text-base font-bold text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Quitar archivo
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="font-display text-base font-bold text-slate-900">
                Arrastra tu archivo aqui o haz clic para seleccionar
              </p>
              <p className="text-sm text-slate-400">CSV, XLSX o TXT</p>
            </div>
          )}
        </div>

        {/* Tag input */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
            Etiqueta para los contactos (opcional)
          </label>
          <input
            placeholder="Ej: clientes-vip, leads-enero"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 max-w-md w-full"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!file || importMutation.isPending}
          className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {importMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {importMutation.isPending ? "Importando..." : "Importar Contactos"}
        </button>
      </DashboardCard>

      {/* Result */}
      {result && (
        <DashboardCard>
          <DashboardCardHeader>
            <DashboardCardTitle>Resultado de Importacion</DashboardCardTitle>
          </DashboardCardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
              <p className="font-display text-xl font-bold text-emerald-600">{result.imported}</p>
              <p className="text-xs text-emerald-600">Importados</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-1" />
              <p className="font-display text-xl font-bold text-amber-600">{result.duplicates}</p>
              <p className="text-xs text-amber-600">Duplicados</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4 text-center">
              <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
              <p className="font-display text-xl font-bold text-red-600">{result.errors}</p>
              <p className="text-xs text-red-600">Errores</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <Users className="h-6 w-6 text-slate-500 mx-auto mb-1" />
              <p className="font-display text-xl font-bold text-slate-600">{result.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
          {result.errorDetails && result.errorDetails.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Detalles de errores</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.errorDetails.map((err, i) => (
                  <p key={i} className="text-xs text-red-500">{err}</p>
                ))}
              </div>
            </div>
          )}
        </DashboardCard>
      )}

      {/* Instructions */}
      <DashboardCard>
        <DashboardCardHeader>
          <DashboardCardTitle>Instrucciones</DashboardCardTitle>
        </DashboardCardHeader>
        <ul className="space-y-2 text-sm text-slate-500">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">1.</span>
            <span>Descarga la plantilla de ejemplo para ver el formato esperado.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">2.</span>
            <span>La columna <strong>Telefono</strong> es obligatoria. Debe incluir codigo de pais (ej: 573001234567).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">3.</span>
            <span>Las columnas <strong>Nombre</strong>, <strong>Email</strong> y <strong>Etiqueta</strong> son opcionales.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">4.</span>
            <span>Los numeros duplicados seran omitidos automaticamente.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">5.</span>
            <span>Puedes asignar una etiqueta global a todos los contactos importados.</span>
          </li>
        </ul>
      </DashboardCard>
    </div>
  );
}
