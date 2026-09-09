import { auditSnapshot } from "@/lib/domain/audit";
import { ApiError } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export function stripManualProjectId(id: string) {
  return id.startsWith("manual:") ? id.slice("manual:".length) : id;
}

export function stripCostCenterId(id: string) {
  return id.startsWith("cost-center:") ? id.slice("cost-center:".length) : id;
}

const IN_USE = new ApiError(
  409,
  "CATALOG_IN_USE",
  "Não é possível excluir porque há histórico vinculado. Inative para impedir novos usos e preserve os registros.",
);

export async function deleteCostCenter(id: string, actorId: string) {
  const item = await prisma.costCenter.findUnique({
    where: { id },
    include: {
      _count: {
        select: { tickets: true, timeEntries: true, activeTimers: true },
      },
    },
  });
  if (!item)
    throw new ApiError(
      404,
      "COST_CENTER_NOT_FOUND",
      "Centro de custo não encontrado.",
    );
  if (
    item._count.tickets ||
    item._count.timeEntries ||
    item._count.activeTimers
  )
    throw IN_USE;

  await prisma.$transaction(async (tx) => {
    await tx.costCenter.delete({ where: { id } });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: "COST_CENTER_DELETED",
        entityType: "CostCenter",
        entityId: id,
        before: auditSnapshot(item),
      },
    });
  });
}

export async function deleteManualProject(id: string, actorId: string) {
  const item = await prisma.manualProject.findUnique({
    where: { id },
    include: {
      _count: { select: { timeEntries: true, activeTimers: true } },
    },
  });
  if (!item)
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Projeto não encontrado.");
  if (item._count.timeEntries || item._count.activeTimers) throw IN_USE;

  await prisma.$transaction(async (tx) => {
    await tx.manualProject.delete({ where: { id } });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: "MANUAL_PROJECT_DELETED",
        entityType: "ManualProject",
        entityId: id,
        before: auditSnapshot(item),
      },
    });
  });
}

export async function deleteService(id: string, actorId: string) {
  const item = await prisma.service.findUnique({
    where: { id },
    include: { _count: { select: { tickets: true } } },
  });
  if (!item)
    throw new ApiError(404, "SERVICE_NOT_FOUND", "Serviço não encontrado.");
  if (item._count.tickets) throw IN_USE;

  await prisma.$transaction(async (tx) => {
    await tx.service.delete({ where: { id } });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: "SERVICE_DELETED",
        entityType: "Service",
        entityId: id,
        before: auditSnapshot(item),
      },
    });
  });
}

export async function deleteServiceGroup(id: string, actorId: string) {
  const item = await prisma.serviceGroup.findUnique({
    where: { id },
    include: {
      services: { include: { _count: { select: { tickets: true } } } },
    },
  });
  if (!item)
    throw new ApiError(
      404,
      "SERVICE_GROUP_NOT_FOUND",
      "Grupo de serviço não encontrado.",
    );
  if (item.services.some((service) => service._count.tickets > 0)) throw IN_USE;

  await prisma.$transaction(async (tx) => {
    await tx.service.deleteMany({ where: { groupId: id } });
    await tx.serviceGroup.delete({ where: { id } });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: "SERVICE_GROUP_DELETED",
        entityType: "ServiceGroup",
        entityId: id,
        before: auditSnapshot(item),
      },
    });
  });
}

export async function deleteAsset(id: string, actorId: string) {
  const item = await prisma.asset.findUnique({
    where: { id },
    include: { _count: { select: { tickets: true } } },
  });
  if (!item)
    throw new ApiError(404, "ASSET_NOT_FOUND", "Ativo não encontrado.");
  if (item._count.tickets) throw IN_USE;

  await prisma.$transaction(async (tx) => {
    await tx.asset.delete({ where: { id } });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: "ASSET_DELETED",
        entityType: "Asset",
        entityId: id,
        before: auditSnapshot(item),
      },
    });
  });
}
