"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse, Message, ApiResponse } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
  queued: "secondary",
  sending: "warning",
  sent: "default",
  delivered: "success",
  read: "success",
  failed: "destructive",
};

export default function MessagesPage() {
  const [page, setPage] = useState(1);

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["messages", page],
    queryFn: () => api.get<PaginatedResponse<Message>>(`/messages?page=${page}&limit=30`),
  });

  const { data: statsData } = useQuery({
    queryKey: ["message-stats"],
    queryFn: () => api.get<ApiResponse<Record<string, number>>>("/messages/stats"),
  });

  const messages = messagesData?.data || [];
  const pagination = messagesData?.pagination;
  const stats = statsData?.data;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-lg md:text-xl font-semibold">Mensajes</h1>
        <p className="text-muted-foreground">Historial de mensajes enviados</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
          {Object.entries(stats).map(([status, count]) => (
            <Card key={status}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <Badge variant={statusColors[status]} className="mt-1">{status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Telefono</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Mensaje</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No hay mensajes aun</td>
                </tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">{msg.phone}</td>
                    <td className="px-4 py-3 text-sm max-w-md truncate">{msg.content}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[msg.status]}>{msg.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Pagina {page} de {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
