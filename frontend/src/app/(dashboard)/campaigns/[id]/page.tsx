"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ApiResponse, Campaign } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: campaignData } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => api.get<ApiResponse<Campaign>>(`/campaigns/${id}`),
  });

  const { data: statsData } = useQuery({
    queryKey: ["campaign-stats", id],
    queryFn: () => api.get<ApiResponse<any>>(`/campaigns/${id}/stats`),
    refetchInterval: 5000,
  });

  const campaign = campaignData?.data;
  const stats = statsData?.data;

  if (!campaign) return <p className="text-center py-8 text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="text-muted-foreground">{campaign.description}</p>
        </div>
        <Badge variant="outline" className="ml-auto text-sm">
          {campaign.status}
        </Badge>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{stats.totalContacts}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.sent}</p>
              <p className="text-sm text-muted-foreground">Enviados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.delivered}</p>
              <p className="text-sm text-muted-foreground">Entregados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-sm text-muted-foreground">Fallidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-whatsapp">{stats.progress}%</p>
              <p className="text-sm text-muted-foreground">Progreso</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mensaje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4 whitespace-pre-wrap">{campaign.message}</div>
        </CardContent>
      </Card>

      {campaign.targetTags && campaign.targetTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags de destino</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {campaign.targetTags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
