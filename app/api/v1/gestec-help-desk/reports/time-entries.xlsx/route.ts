import ExcelJS from "exceljs";

import { requirePermission } from "@/lib/auth/session";
import { allocateSeconds } from "@/lib/domain/project-rateio";
import { reportTimeEntryWhere } from "@/lib/domain/report-query";
import {
  displayPersonName,
  formatCatalogLabel,
  formatSharePercent,
  timeEntrySourceLabels,
  timeEntryStatusLabels,
} from "@/lib/format";
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
    const { where, costCenterId } = await reportTimeEntryWhere(searchParams);
    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        ticket: { select: { number: true } },
        costCenter: { select: { code: true, name: true } },
        manualProject: { select: { code: true, name: true } },
      },
      orderBy: { startedAt: "asc" },
    });
    const projectIds = [
      ...new Set(
        entries
          .map((entry) => entry.manualProjectId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const shares = projectIds.length
      ? await prisma.projectCostCenterShare.findMany({
          where: { manualProjectId: { in: projectIds } },
          select: {
            manualProjectId: true,
            costCenterId: true,
            shareBps: true,
            costCenter: { select: { code: true, name: true } },
          },
        })
      : [];
    const sharesByProject = new Map<
      string,
      Array<{
        costCenterId: string;
        shareBps: number;
        code: string;
        name: string;
      }>
    >();
    for (const share of shares) {
      const current = sharesByProject.get(share.manualProjectId) ?? [];
      current.push({
        costCenterId: share.costCenterId,
        shareBps: share.shareBps,
        code: share.costCenter.code,
        name: share.costCenter.name,
      });
      sharesByProject.set(share.manualProjectId, current);
    }

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
      { header: "Duração original (h)", key: "originalDuration", width: 20 },
      { header: "Duração rateada (h)", key: "duration", width: 18 },
      { header: "Descrição", key: "description", width: 44 },
      { header: "Centro de custo", key: "costCenter", width: 28 },
      { header: "Projeto Semear", key: "project", width: 28 },
      { header: "Rateio (%)", key: "rateioPercent", width: 14 },
      { header: "Rateio", key: "rateio", width: 36 },
      { header: "Ticket", key: "ticket", width: 16 },
      { header: "Usuário", key: "user", width: 24 },
      { header: "Faturável", key: "billable", width: 13 },
      { header: "Origem", key: "source", width: 14 },
      { header: "Status", key: "status", width: 24 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = { from: "A1", to: "O1" };

    let rowCount = 0;
    for (const entry of entries) {
      const projectLabel = entry.manualProject
        ? formatCatalogLabel(entry.manualProject.code, entry.manualProject.name)
        : "";
      const directCostCenter = entry.costCenter
        ? formatCatalogLabel(entry.costCenter.code, entry.costCenter.name)
        : "";
      const userName = displayPersonName(entry.user.name, entry.user.email);
      const projectShares = entry.manualProjectId
        ? (sharesByProject.get(entry.manualProjectId) ?? [])
        : [];
      const allocated = projectShares.length
        ? allocateSeconds(entry.durationSeconds, projectShares).filter(
            (share) => !costCenterId || share.costCenterId === costCenterId,
          )
        : [];
      const rows = allocated.length
        ? allocated.map((share) => ({
            costCenter: formatCatalogLabel(share.code, share.name),
            project: projectLabel,
            rateioPercent: share.shareBps / 100,
            rateio: `${formatSharePercent(share.shareBps)}% ${formatCatalogLabel(share.code, share.name)}`,
            duration: share.seconds / 3600,
          }))
        : [
            {
              costCenter: directCostCenter,
              project: projectLabel,
              rateioPercent: "",
              rateio: projectShares.length ? "Rateio filtrado" : "",
              duration: entry.durationSeconds / 3600,
            },
          ];

      for (const row of rows) {
        sheet.addRow({
          date: entry.startedAt.toLocaleDateString("pt-BR"),
          start: entry.startedAt,
          end: entry.endedAt,
          originalDuration: entry.durationSeconds / 3600,
          duration: row.duration,
          description: safeCell(entry.description),
          costCenter: safeCell(row.costCenter),
          project: safeCell(row.project),
          rateioPercent: row.rateioPercent,
          rateio: safeCell(row.rateio),
          ticket: entry.ticket ? `#${entry.ticket.number}` : "",
          user: safeCell(userName),
          billable: entry.billable ? "Sim" : "Não",
          source: timeEntrySourceLabels[entry.source] ?? entry.source,
          status: timeEntryStatusLabels[entry.status] ?? entry.status,
        });
        rowCount += 1;
      }
    }
    sheet.getColumn("start").numFmt = "dd/mm/yyyy hh:mm";
    sheet.getColumn("end").numFmt = "dd/mm/yyyy hh:mm";
    sheet.getColumn("originalDuration").numFmt = "0.00";
    sheet.getColumn("duration").numFmt = "0.00";
    sheet.getColumn("rateioPercent").numFmt = "0.00";
    const buffer = await workbook.xlsx.writeBuffer();
    await prisma.auditEvent.create({
      data: {
        actorId: session.userId,
        action: "TIME_ENTRIES_EXPORTED",
        entityType: "TimeEntryExport",
        entityId: crypto.randomUUID(),
        after: {
          filters: Object.fromEntries(searchParams.entries()),
          rowCount,
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
