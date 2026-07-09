import * as XLSX from "xlsx";
import type { campaigns } from "../../../infrastructure/database/schema/campaigns.js";

type CampaignRow = typeof campaigns.$inferSelect;

export interface ReportMessageRow {
  phone: string;
  status: string;
  errorMessage: string | null;
  estimatedCost: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
}

const STATUS_LABELS: Record<string, string> = {
  queued: "En cola",
  sending: "Enviando",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leido",
  failed: "Fallido",
};

function formatDate(date: Date | null | undefined): string {
  return date ? new Date(date).toLocaleString("es-CO") : "";
}

/** Genera el archivo .xlsx del reporte de una campaña: resumen + detalle por destinatario. */
export function buildCampaignReportWorkbook(campaign: CampaignRow, rows: ReportMessageRow[]): Buffer {
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Reporte de campaña"],
    [],
    ["Campaña", campaign.name],
    ["Estado", campaign.status],
    ["Total contactos", campaign.totalContacts],
    ["Enviados", campaign.sentCount],
    ["Entregados", campaign.deliveredCount],
    ["Fallidos", campaign.failedCount],
    ["Inicio", formatDate(campaign.startedAt)],
    ["Finalización", formatDate(campaign.completedAt)],
    ["Generado el", formatDate(new Date())],
  ]);
  summarySheet["!cols"] = [{ wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

  const detailHeaders = ["Teléfono", "Estado", "Enviado el", "Entregado el", "Error", "Costo estimado"];
  const detailAoa = [
    detailHeaders,
    ...rows.map((r) => [
      r.phone,
      STATUS_LABELS[r.status] || r.status,
      formatDate(r.sentAt),
      formatDate(r.deliveredAt),
      r.errorMessage || "",
      r.estimatedCost || "",
    ]),
  ];
  const detailSheet = XLSX.utils.aoa_to_sheet(detailAoa);
  detailSheet["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 35 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
