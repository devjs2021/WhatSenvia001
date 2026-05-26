"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, WhatsAppSession } from "@/types";
import { toast } from "sonner";
import {
  Users,
  Download,
  RefreshCw,
  Search,
  Filter,
  Copy,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardDescription } from "@/components/ui/dashboard-card";

interface ExtractedContact {
  phone: string;
  name?: string;
  pushName?: string;
  isBusiness?: boolean;
  isMyContact?: boolean;
}

export default function ExtractContactsPage() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [contacts, setContacts] = useState<ExtractedContact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBusiness, setFilterBusiness] = useState<boolean | null>(null);
  const [filterMyContact, setFilterMyContact] = useState<boolean | null>(null);

  const { data: sessionsData } = useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: () => api.get<ApiResponse<WhatsAppSession[]>>("/whatsapp/sessions"),
  });

  const sessions = (sessionsData?.data || []).filter((s) => s.status === "connected");
  const baileysSessions = sessions.filter((s) => s.connectionType !== "meta_cloud");


  const extractMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.post<ApiResponse<{ contacts: ExtractedContact[] }>>(`/whatsapp/sessions/${sessionId}/extract-contacts`),
    onSuccess: (data) => {
      setContacts(data.data.contacts);
      toast.success(`${data.data.contacts.length} contactos extraidos`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredContacts = contacts.filter((c) => {
    const phone = c.phone || "";
    const name = c.name || c.pushName || "";
    const search = searchTerm.toLowerCase();
    if (searchTerm && !phone.includes(search) && !name.toLowerCase().includes(search)) return false;
    if (filterBusiness !== null && c.isBusiness !== filterBusiness) return false;
    if (filterMyContact !== null && c.isMyContact !== filterMyContact) return false;
    return true;
  });

  const downloadCSV = () => {
    if (filteredContacts.length === 0) {
      toast.error("No hay contactos para descargar");
      return;
    }
    let csv = "Telefono,Nombre,PushName,EsBusiness,EsContacto\n";
    for (const c of filteredContacts) {
      csv += `${c.phone},"${c.name || ""}","${c.pushName || ""}",${c.isBusiness ? "Si" : "No"},${c.isMyContact ? "Si" : "No"}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contactos_extraidos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  };

  const copyPhones = () => {
    const phones = filteredContacts.map((c) => c.phone).filter(Boolean);
    if (phones.length === 0) {
      toast.error("No hay numeros para copiar");
      return;
    }
    navigator.clipboard.writeText(phones.join("\n"));
    toast.success(`${phones.length} numeros copiados`);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <DashboardHeader
        title={
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Extraer Contactos
          </div>
        }
        description="Extrae los contactos de tus sesiones de WhatsApp conectadas"
      />

      {/* Session selector */}
      <DashboardCard>
        <DashboardCardHeader>
          <DashboardCardTitle>Seleccionar Sesion</DashboardCardTitle>
          <DashboardCardDescription>
            Elige la sesion de WhatsApp de la cual deseas extraer los contactos
          </DashboardCardDescription>
        </DashboardCardHeader>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer max-w-md w-full"
          >
            <option value="">Selecciona una sesion WhatsApp...</option>
            {baileysSessions.map((s) => (
              <option key={s.id} value={s.id}>
                WhatsApp · {s.phone || s.name}
              </option>
            ))}
            {baileysSessions.length === 0 && (
              <option disabled>No hay sesiones WhatsApp (QR) conectadas</option>
            )}
          </select>
          <button
            onClick={() => selectedSessionId && extractMutation.mutate(selectedSessionId)}
            disabled={!selectedSessionId || extractMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {extractMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {extractMutation.isPending ? "Extrayendo..." : "Extraer Contactos"}
          </button>
        </div>
        {baileysSessions.length === 0 && sessions.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="text-sm text-amber-700">
              <strong>Nota:</strong> La extraccion de contactos solo funciona con sesiones WhatsApp conectadas via codigo QR (Baileys).
              Las sesiones Meta Cloud no soportan esta funcion.
            </p>
          </div>
        )}
      </DashboardCard>

      {/* Filters */}
      {contacts.length > 0 && (
        <DashboardCard>
          <DashboardCardHeader>
            <DashboardCardTitle>
              Contactos Extraidos
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 ml-2">
                {filteredContacts.length} de {contacts.length}
              </span>
            </DashboardCardTitle>
          </DashboardCardHeader>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder="Buscar por telefono o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterBusiness(filterBusiness === null ? true : filterBusiness === true ? false : null)}
                className={`rounded-xl px-3 py-2 text-xs font-medium transition-all border ${
                  filterBusiness === true
                    ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                    : filterBusiness === false
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                Business
              </button>
              <button
                onClick={() => setFilterMyContact(filterMyContact === null ? true : filterMyContact === true ? false : null)}
                className={`rounded-xl px-3 py-2 text-xs font-medium transition-all border ${
                  filterMyContact === true
                    ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                    : filterMyContact === false
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                En agenda
              </button>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterBusiness(null);
                  setFilterMyContact(null);
                }}
                className="rounded-xl px-3 py-2 text-xs font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={downloadCSV}
              disabled={filteredContacts.length === 0}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Descargar CSV
            </button>
            <button
              onClick={copyPhones}
              disabled={filteredContacts.length === 0}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <Copy className="h-4 w-4" />
              Copiar Numeros
            </button>
          </div>

          {/* Contacts table */}
          <div className="max-h-96 overflow-y-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Telefono</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Push Name</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Business</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">En Agenda</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No se encontraron contactos con los filtros actuales
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((c, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/30">
                      <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-600">{c.phone}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{c.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{c.pushName || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        {c.isBusiness ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-300 inline" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.isMyContact ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-300 inline" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      )}
    </div>
  );
}
