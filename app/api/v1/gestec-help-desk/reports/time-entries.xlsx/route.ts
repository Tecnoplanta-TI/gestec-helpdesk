import ExcelJS from "exceljs";

import { requirePermission } from "@/lib/auth/session";
import { reportFilters } from "@/lib/domain/report-query";
import { errorResponse } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function safeCell(value: string | null | undefined) {
  if (!value) return "";
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function GET(request: Request) {
  try {
    const session = await requirePermission("reports:export");
    const { searchParams } = new URL(request.url);
    const { where } = reportFilters(searchParams);
    const entries = await prisma.timeEntry.findMany({
      where,
      include: { user: true, ticket: true },
      orderBy: { startedAt: "asc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Gestec Help Desk";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Apontamentos", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.columns = [
      { header: "Data", key: "date", width: 13 },
      { header: "Início", key: "start", width: 20 },
      { header: "Fim", key: "end", width: 20 },
      { header: "Duração (h)", key: "duration", width: 14 },
      { header: "Descrição", key: "description", width: 44 },
      { header: "Centro de custo", key: "costCenter", width: 28 },
      { header: "Projeto Semear", key: "project", width: 28 },
      { header: "Ticket", key: "ticket", width: 16 },
      { header: "Usuário", key: "user", width: 24 },
      { header: "Faturável", key: "billable", width: 13 },
      { header: "Origem", key: "source", width: 14 },
      { header: "Status", key: "status", width: 24 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = { from: "A1", to: "L1" };
    for (const entry of entries) {
      sheet.addRow({
        date: entry.startedAt.toLocaleDateString("pt-BR"),
        start: entry.startedAt,
        end: entry.endedAt,
        duration: entry.durationSeconds / 3600,
        description: safeCell(entry.description),
        costCenter: entry.costCenterId
          ? safeCell(entry.projectNameSnapshot)
          : "",
        project: entry.manualProjectId
          ? safeCell(entry.projectNameSnapshot)
          : "",
        ticket: entry.ticket ? `#${entry.ticket.number}` : "",
        user: safeCell(entry.user.name),
        billable: entry.billable ? "Sim" : "Não",
        source: entry.source,
        status: entry.status,
      });
    }
    sheet.getColumn("start").numFmt = "dd/mm/yyyy hh:mm";
    sheet.getColumn("end").numFmt = "dd/mm/yyyy hh:mm";
    sheet.getColumn("duration").numFmt = "0.00";
    const buffer = await workbook.xlsx.writeBuffer();
    await prisma.auditEvent.create({
      data: {
        actorId: session.userId,
        action: "TIME_ENTRIES_EXPORTED",
        entityType: "TimeEntryExport",
        entityId: crypto.randomUUID(),
        after: {
          filters: Object.fromEntries(searchParams.entries()),
          rowCount: entries.length,
        },
      },
    });
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="gestec-apontamentos-${date}.xlsx"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
