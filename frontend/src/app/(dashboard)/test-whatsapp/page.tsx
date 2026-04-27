"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  details?: any;
  timestamp: string;
}

export default function TestWhatsAppPage() {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const handleSend = async () => {
    if (!phone.trim()) return;
    setSending(true);

    const timestamp = new Date().toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    try {
      const data: any = await api.post("/test-whatsapp/send", { to: phone.trim() });
      setResults((prev) => [{ ...data, timestamp }, ...prev]);
    } catch (err: any) {
      setResults((prev) => [
        { success: false, error: err.message || "Error de conexion", timestamp },
        ...prev,
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg md:text-xl font-semibold">Panel de Prueba</h1>
          <Badge variant="warning" className="text-[10px]">Meta Cloud API</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Envia mensajes de prueba usando la API oficial de WhatsApp Business
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Enviar Mensaje de Prueba
          </CardTitle>
          <CardDescription>
            Envia la plantilla <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">hello_world</code> a un numero de WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Numero destino (ej: +573001234567)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10"
              />
            </div>
            <Button type="submit" disabled={sending || !phone.trim()} className="h-10">
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Enviando..." : "Enviar Mensaje"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Resultados
            </CardTitle>
            <CardDescription>{results.length} envio{results.length > 1 ? "s" : ""} realizado{results.length > 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((result, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 ${
                  result.success
                    ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
                    : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium text-sm">
                      {result.success ? "Enviado correctamente" : "Error al enviar"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {result.success ? result.message : result.error}
                </p>
                {result.data && (
                  <pre className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
                {result.details && !result.success && (
                  <pre className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
