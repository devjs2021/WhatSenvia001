"use client";

import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  ClipboardPaste,
  Link2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

type Tab = "csv" | "paste" | "sheets";

interface ParsedContact {
  phone: string;
  name?: string;
  email?: string;
  tags?: string[];
}

interface ColumnMapping {
  phone: number;
  name: number;
  email: number;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === "," || ch === "\t" || ch === ";") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseData(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(parseCSVLine);
  return { headers, rows };
}

function guessColumnIndex(headers: string[], keywords: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<Tab>("csv");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ phone: 0, name: -1, email: -1 });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [fetchingSheet, setFetchingSheet] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const resetState = useCallback(() => {
    setHeaders([]);
    setRows([]);
    setResult(null);
    setError(null);
  }, []);

  const loadParsedData = useCallback((text: string) => {
    const { headers: h, rows: r } = parseData(text);
    if (h.length === 0) {
      setError("No se encontraron datos para importar.");
      return;
    }
    setHeaders(h);
    setRows(r);
    setResult(null);
    setError(null);

    // Auto-map columns
    const phoneIdx = guessColumnIndex(h, ["phone", "telefono", "tel", "celular", "numero", "whatsapp"]);
    const nameIdx = guessColumnIndex(h, ["name", "nombre", "contacto"]);
    const emailIdx = guessColumnIndex(h, ["email", "correo", "mail"]);
    setMapping({
      phone: phoneIdx >= 0 ? phoneIdx : 0,
      name: nameIdx,
      email: emailIdx,
    });
  }, []);

  const handleFileUpload = useCallback(
    (file: File) => {
      resetState();
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        loadParsedData(text);
      };
      reader.readAsText(file);
    },
    [resetState, loadParsedData]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handlePaste = useCallback(
    (text: string) => {
      resetState();
      if (text.trim()) loadParsedData(text);
    },
    [resetState, loadParsedData]
  );

  const handleFetchSheet = useCallback(async () => {
    resetState();
    setFetchingSheet(true);
    try {
      // Convert Google Sheets URL to CSV export URL
      let csvUrl = sheetsUrl;
      const match = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        const sheetId = match[1];
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      }
      const resp = await fetch(csvUrl);
      if (!resp.ok) throw new Error("No se pudo descargar la hoja. Verifica que sea publica.");
      const text = await resp.text();
      loadParsedData(text);
    } catch (err: any) {
      setError(err.message || "Error al descargar la hoja de calculo.");
    } finally {
      setFetchingSheet(false);
    }
  }, [sheetsUrl, resetState, loadParsedData]);

  const handleImport = useCallback(async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setError(null);
    setResult(null);

    const contacts: ParsedContact[] = rows
      .map((row) => ({
        phone: row[mapping.phone] ?? "",
        name: mapping.name >= 0 ? row[mapping.name] ?? "" : "",
        email: mapping.email >= 0 ? row[mapping.email] ?? "" : "",
      }))
      .filter((c) => c.phone.replace(/\D/g, "").length >= 8);

    if (contacts.length === 0) {
      setError("No se encontraron contactos validos con numeros de telefono.");
      setImporting(false);
      return;
    }

    try {
      const res = await api.post<{ success: boolean; data: { imported: number } }>(
        "/contacts/import",
        { contacts }
      );
      setResult(res.data);
    } catch (err: any) {
      setError(err.message || "Error al importar contactos.");
    } finally {
      setImporting(false);
    }
  }, [rows, mapping]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "csv", label: "Archivo CSV", icon: FileSpreadsheet },
    { id: "paste", label: "Pegar Datos", icon: ClipboardPaste },
    { id: "sheets", label: "Google Sheets URL", icon: Link2 },
  ];

  const previewRows = rows.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar Contactos</h1>
        <p className="text-muted-foreground text-sm">
          Importa contactos desde archivos CSV, datos pegados o Google Sheets
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              resetState();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="p-6">
          {/* CSV Upload */}
          {activeTab === "csv" && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">
                  Arrastra un archivo CSV aqui o haz click para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos: .csv, .txt (separado por comas, tabs o punto y coma)
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          )}

          {/* Paste Data */}
          {activeTab === "paste" && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Pega datos tabulares (desde Google Sheets, Excel, etc). La primera fila debe contener
                los encabezados.
              </p>
              <textarea
                className="w-full h-48 border rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                placeholder={"nombre\ttelefono\temail\nJuan Perez\t+5491155551234\tjuan@email.com\nMaria Lopez\t+5491155555678\tmaria@email.com"}
                onChange={(e) => handlePaste(e.target.value)}
              />
            </div>
          )}

          {/* Google Sheets URL */}
          {activeTab === "sheets" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800">
                  La hoja de Google Sheets debe ser publica. Ve a{" "}
                  <span className="font-medium">Archivo &gt; Compartir &gt; Publicar en la web</span>{" "}
                  y selecciona formato CSV.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <button
                  onClick={handleFetchSheet}
                  disabled={!sheetsUrl || fetchingSheet}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {fetchingSheet && <Loader2 className="h-4 w-4 animate-spin" />}
                  Obtener
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview & Mapping */}
      {headers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vista Previa y Mapeo de Columnas</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Column Mapping */}
            <div className="flex flex-wrap gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Telefono:</label>
                <select
                  value={mapping.phone}
                  onChange={(e) => setMapping({ ...mapping, phone: Number(e.target.value) })}
                  className="border rounded px-2 py-1 text-sm bg-background"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Nombre:</label>
                <select
                  value={mapping.name}
                  onChange={(e) => setMapping({ ...mapping, name: Number(e.target.value) })}
                  className="border rounded px-2 py-1 text-sm bg-background"
                >
                  <option value={-1}>-- No mapear --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Email:</label>
                <select
                  value={mapping.email}
                  onChange={(e) => setMapping({ ...mapping, email: Number(e.target.value) })}
                  className="border rounded px-2 py-1 text-sm bg-background"
                >
                  <option value={-1}>-- No mapear --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {headers.map((h, i) => (
                      <th
                        key={i}
                        className={`pb-2 px-2 text-left font-medium ${
                          i === mapping.phone
                            ? "text-green-700"
                            : i === mapping.name
                            ? "text-blue-700"
                            : i === mapping.email
                            ? "text-purple-700"
                            : "text-muted-foreground"
                        }`}
                      >
                        {h}
                        {i === mapping.phone && (
                          <Badge variant="outline" className="ml-1 text-[10px] border-green-300 text-green-700">
                            Tel
                          </Badge>
                        )}
                        {i === mapping.name && (
                          <Badge variant="outline" className="ml-1 text-[10px] border-blue-300 text-blue-700">
                            Nombre
                          </Badge>
                        )}
                        {i === mapping.email && (
                          <Badge variant="outline" className="ml-1 text-[10px] border-purple-300 text-purple-700">
                            Email
                          </Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="border-b last:border-0">
                      {headers.map((_, ci) => (
                        <td key={ci} className="py-2 px-2 truncate max-w-[200px]">
                          {row[ci] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Mostrando {previewRows.length} de {rows.length} filas
            </p>

            {/* Import Button */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <button
                onClick={handleImport}
                disabled={importing || rows.length === 0}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                Importar {rows.length} contacto{rows.length !== 1 ? "s" : ""}
              </button>

              {result && (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {result.imported} contacto{result.imported !== 1 ? "s" : ""} importado
                    {result.imported !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
