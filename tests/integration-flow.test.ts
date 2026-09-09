import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TicketStatus, UserRole } from "@prisma/client";

import {
  receiveZeevEvaluation,
  receiveZeevTicket,
} from "@/lib/domain/integrations";
import {
  resolveTicket,
  startTicketWork,
  stopTicketWork,
} from "@/lib/domain/tickets";
import {
  createManualTimeEntry,
  startTimer,
  stopTimer,
} from "@/lib/domain/time";
import {
  deleteCostCenter,
  deleteManualProject,
} from "@/lib/domain/catalog-delete";
import { prisma } from "@/lib/prisma";

const runId = randomUUID();
const userId = randomUUID();
const externalReference = `TEST-${runId}`;
const costCenterCode = `T${runId.slice(0, 7)}`;

describe.runIf(Boolean(process.env.DATABASE_URL))(
  "fluxo integrado com PostgreSQL",
  () => {
    let ticketId = "";
    let costCenterId = "";
    let privateProjectId = "";

    beforeAll(async () => {
      process.env.ZEEV_CALLBACK_URL = "";
      await prisma.userRef.create({
        data: {
          id: userId,
          externalId: `test-user-${runId}`,
          name: "Técnico de Teste",
          email: `test-${runId}@gestec.invalid`,
          role: UserRole.TECHNICIAN,
        },
      });
      const costCenter = await prisma.costCenter.create({
        data: {
          code: costCenterCode,
          name: `Centro ${runId}`,
          normalizedName: `centro-${runId}`,
        },
      });
      costCenterId = costCenter.id;
      const project = await prisma.manualProject.create({
        data: {
          name: `Privado ${runId}`,
          normalizedName: `privado-${runId}`,
          color: "#10b981",
          availableToAll: false,
        },
      });
      privateProjectId = project.id;
    });

    afterAll(async () => {
      if (ticketId) {
        await prisma.ticketParticipant.deleteMany({ where: { ticketId } });
        await prisma.ticketAttachment.deleteMany({ where: { ticketId } });
        await prisma.ticketAsset.deleteMany({ where: { ticketId } });
        await prisma.ticketEvaluation.deleteMany({ where: { ticketId } });
        await prisma.syncExecution.deleteMany({ where: { ticketId } });
        await prisma.timeEntry.deleteMany({
          where: { OR: [{ ticketId }, { userId }] },
        });
        await prisma.ticketWorkPeriod.deleteMany({ where: { ticketId } });
        await prisma.ticketHistory.deleteMany({ where: { ticketId } });
        await prisma.ticket.deleteMany({ where: { id: ticketId } });
      }
      await prisma.activeTimer.deleteMany({ where: { userId } });
      await prisma.auditEvent.deleteMany({ where: { actorId: userId } });
      await prisma.costCenter.deleteMany({ where: { id: costCenterId } });
      await prisma.manualProject.deleteMany({
        where: { id: privateProjectId },
      });
      await prisma.userRef.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    });

    it("recebe o ticket do Zeev sem duplicar o replay", async () => {
      const payload = {
        schemaVersion: "1.0" as const,
        event: "ticket.ready_for_service" as const,
        idempotencyKey: `zeev:${runId}:create`,
        source: {
          system: "zeev" as const,
          processName: "Abertura de Ticket T.I",
          instanceId: runId,
          instanceUrl: "https://tecnoplanta.zeev.it",
        },
        requester: { openedAt: new Date(), name: "Solicitante de Teste" },
        ticket: {
          externalReference,
          costCenter: { sourceValue: costCenterCode },
          priority: "Alta",
          summary: "Validar integração automatizada",
        },
        assignment: {},
      };
      const first = await receiveZeevTicket(payload);
      const replay = await receiveZeevTicket(payload);
      ticketId = first.ticket.id;
      expect(first.replay).toBe(false);
      expect(replay.replay).toBe(true);
      expect(replay.ticket.id).toBe(first.ticket.id);
      expect(first.ticket.costCenterId).toBe(costCenterId);
    });

    it("consolida períodos uma vez e aceita finalização repetida", async () => {
      const [period, replayStart] = await Promise.all([
        startTicketWork(ticketId, userId, `work:${runId}`),
        startTicketWork(ticketId, userId, `work:${runId}`),
      ]);
      expect(replayStart.id).toBe(period.id);
      await stopTicketWork(ticketId, userId, `work-stop:${runId}`);
      const replayStop = await stopTicketWork(
        ticketId,
        userId,
        `work-stop:${runId}`,
      );
      expect(replayStop.id).toBe(period.id);
      await prisma.ticketWorkPeriod.update({
        where: { id: period.id },
        data: { endedAt: new Date(period.startedAt.getTime() + 60_000) },
      });
      const current = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticketId },
      });
      const requestKey = `zeev:${runId}:resolve:1`;
      const first = await resolveTicket({
        ticketId,
        userId,
        resolutionSummary: "Problema resolvido.",
        version: current.version,
        requestKey,
      });
      const replay = await resolveTicket({
        ticketId,
        userId,
        resolutionSummary: "Problema resolvido.",
        version: current.version,
        requestKey,
      });
      const entries = await prisma.timeEntry.findMany({
        where: { ticketId, userId },
      });
      expect(first.status).toBe(TicketStatus.RESOLVED);
      expect(replay.id).toBe(first.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].durationSeconds).toBe(60);
    });

    it("roteia avaliação baixa ao responsável em novo ciclo", async () => {
      const payload = {
        externalReference,
        externalId: `evaluation:${runId}`,
        score: 4,
        justification: "A falha voltou.",
        expectationMet: false,
      };
      const result = await receiveZeevEvaluation(payload);
      const replay = await receiveZeevEvaluation(payload);
      expect(result.ticket.status).toBe(TicketStatus.REOPENED_LOW_SCORE);
      expect(result.ticket.resolutionCycle).toBe(2);
      expect(result.routedToAssigneeId).toBe(userId);
      expect(result.replay).toBe(false);
      expect(replay.replay).toBe(true);
      expect(replay.ticket.resolutionCycle).toBe(2);
      expect(
        await prisma.ticketHistory.count({
          where: { ticketId, action: "LOW_SCORE_REOPENED" },
        }),
      ).toBe(1);
    });

    it("preserva a avaliação anterior quando o ticket é concluído novamente", async () => {
      const period = await startTicketWork(
        ticketId,
        userId,
        `work-cycle-2:${runId}`,
      );
      await stopTicketWork(ticketId, userId, `work-cycle-2-stop:${runId}`);
      await prisma.ticketWorkPeriod.update({
        where: { id: period.id },
        data: { endedAt: new Date(period.startedAt.getTime() + 45_000) },
      });

      const current = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticketId },
      });
      await resolveTicket({
        ticketId,
        userId,
        resolutionSummary: "Correção validada após a reabertura.",
        version: current.version,
        requestKey: `zeev:${runId}:resolve:2`,
      });

      const payload = {
        externalReference,
        externalId: `evaluation-cycle-2:${runId}`,
        score: 9,
        expectationMet: true,
      };
      const result = await receiveZeevEvaluation(payload);
      const replay = await receiveZeevEvaluation(payload);
      const evaluations = await prisma.ticketEvaluation.findMany({
        where: { ticketId },
        orderBy: { resolutionCycle: "asc" },
      });

      expect(result.ticket.status).toBe(TicketStatus.CLOSED);
      expect(replay.replay).toBe(true);
      expect(evaluations).toHaveLength(2);
      expect(evaluations.map((item) => item.resolutionCycle)).toEqual([1, 2]);
      expect(evaluations.map((item) => item.score)).toEqual([4, 9]);
    });

    it("mantém apenas um timer e torna a parada idempotente", async () => {
      const projectId = `cost-center:${costCenterId}`;
      const timerInput = {
        userId,
        description: "Timer automatizado",
        projectId,
        billable: true,
        requestKey: `timer:${runId}:start`,
      };
      const [timer, replayStart] = await Promise.all([
        startTimer(timerInput),
        startTimer(timerInput),
      ]);
      await prisma.activeTimer.update({
        where: { id: timer.id },
        data: { startedAt: new Date(timer.startedAt.getTime() - 30_000) },
      });
      const firstStop = await stopTimer(userId, { timerId: timer.id });
      const replayStop = await stopTimer(userId, { timerId: timer.id });
      expect(replayStart.id).toBe(timer.id);
      expect(firstStop.id).toBe(replayStop.id);
      expect(firstStop.durationSeconds).toBeGreaterThanOrEqual(30);
      await expect(
        startTimer({
          userId,
          description: "Timer automatizado",
          projectId,
          billable: true,
          requestKey: `timer:${runId}:start`,
        }),
      ).rejects.toMatchObject({
        status: 409,
        code: "TIMER_ALREADY_COMPLETED",
      });
    });

    it("torna lançamentos manuais concorrentes idempotentes", async () => {
      const startedAt = new Date("2026-09-04T09:00:00-03:00");
      const input = {
        userId,
        description: "Registro idempotente",
        projectId: `cost-center:${costCenterId}`,
        billable: true,
        startedAt,
        endedAt: new Date(startedAt.getTime() + 30 * 60_000),
        requestKey: `manual:${runId}`,
      };
      const [first, replay] = await Promise.all([
        createManualTimeEntry(input),
        createManualTimeEntry(input),
      ]);

      expect(replay.id).toBe(first.id);
      expect(
        await prisma.timeEntry.count({
          where: { idempotencyKey: input.requestKey },
        }),
      ).toBe(1);
    });

    it("não permite que técnico selecione projeto manual restrito por ID direto", async () => {
      await expect(
        startTimer({
          userId,
          description: "Tentativa sem escopo",
          projectId: `manual:${privateProjectId}`,
          billable: false,
          requestKey: `timer-private:${runId}`,
        }),
      ).rejects.toMatchObject({ status: 403, code: "PROJECT_FORBIDDEN" });
    });

    it("exclui cadastros sem histórico e bloqueia os que já foram usados", async () => {
      const unusedCenter = await prisma.costCenter.create({
        data: {
          code: `U${runId.slice(0, 7)}`,
          name: `Livre ${runId}`,
          normalizedName: `livre-${runId}`,
        },
      });
      const unusedProject = await prisma.manualProject.create({
        data: {
          name: `Livre ${runId}`,
          normalizedName: `livre-manual-${runId}`,
          color: "#6366f1",
        },
      });
      await deleteCostCenter(unusedCenter.id, userId);
      await deleteManualProject(unusedProject.id, userId);
      expect(
        await prisma.costCenter.findUnique({ where: { id: unusedCenter.id } }),
      ).toBeNull();
      expect(
        await prisma.manualProject.findUnique({
          where: { id: unusedProject.id },
        }),
      ).toBeNull();
      await prisma.timeEntry.create({
        data: {
          userId,
          manualProjectId: privateProjectId,
          source: "MANUAL",
          description: "Histórico de exclusão",
          startedAt: new Date(Date.now() - 60_000),
          endedAt: new Date(),
          durationSeconds: 60,
        },
      });
      await expect(
        deleteCostCenter(costCenterId, userId),
      ).rejects.toMatchObject({ status: 409, code: "CATALOG_IN_USE" });
      await expect(
        deleteManualProject(privateProjectId, userId),
      ).rejects.toMatchObject({ status: 409, code: "CATALOG_IN_USE" });
    });
  },
);
