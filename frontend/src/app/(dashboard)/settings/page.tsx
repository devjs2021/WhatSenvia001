"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NotificationEmail {
  id: string;
  email: string;
  createdAt: string;
}

function NotificationEmailsCard() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["notification-emails"],
    queryFn: () => api.get<ApiResponse<NotificationEmail[]>>("/notification-emails"),
  });

  const emails = data?.data || [];

  const addMutation = useMutation({
    mutationFn: (email: string) => api.post<ApiResponse<NotificationEmail>>("/notification-emails", { email }),
    onSuccess: () => {
      setNewEmail("");
      queryClient.invalidateQueries({ queryKey: ["notification-emails"] });
      toast.success("Correo agregado");
    },
    onError: (err: any) => toast.error(err.message || "No se pudo agregar el correo"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notification-emails/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-emails"] });
      toast.success("Correo eliminado");
    },
    onError: (err: any) => toast.error(err.message || "No se pudo eliminar el correo"),
  });

  function handleAdd() {
    if (!newEmail.trim()) return;
    addMutation.mutate(newEmail.trim());
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Correos de notificación
        </CardTitle>
        <CardDescription>
          Además de tu correo de cuenta, estos correos también recibirán avisos de
          campañas finalizadas, cambios de estado de plantillas de Meta y
          vencimiento de tu plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="correo@ejemplo.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={addMutation.isPending || !newEmail.trim()}>
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar"}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No has agregado correos adicionales. Solo tu correo de cuenta recibe notificaciones.
          </p>
        ) : (
          <div className="space-y-2">
            {emails.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{e.email}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeMutation.mutate(e.id)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-lg md:text-xl font-semibold">Configuracion</h1>
        <p className="text-muted-foreground">Administra tu cuenta y preferencias</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Informacion de tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Empresa</p>
              <p className="font-medium">{user?.company || "No especificada"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <NotificationEmailsCard />

      <Card>
        <CardHeader>
          <CardTitle>Limites de envio</CardTitle>
          <CardDescription>Limites para proteger tu cuenta de WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold">8</p>
              <p className="text-sm text-muted-foreground">msgs/minuto</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold">200</p>
              <p className="text-sm text-muted-foreground">msgs/hora</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold">1,500</p>
              <p className="text-sm text-muted-foreground">msgs/dia</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider de WhatsApp</CardTitle>
          <CardDescription>Motor de envio actualmente en uso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="success">Activo</Badge>
            <span className="font-medium">Baileys (Fase 1 - API no oficial)</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando tu cuenta de Meta Business sea aprobada, podras cambiar al provider oficial (Meta Cloud API)
            sin necesidad de reescribir codigo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
