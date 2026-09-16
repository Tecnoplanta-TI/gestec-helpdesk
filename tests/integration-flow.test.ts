import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  SyncDirection,
  SyncStatus,
  TicketStatus,
  UserRole,
} from "@prisma/client";

import {
  receiveZeevEvaluation,
  receiveZeevStageReady,
  receiveZeevTicket,
} from "@/lib/domain/integrations";
import {
  approveTicketConclusion,
  reviewTicketDeviation,
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
import { listProjectCatalog, listProjects } from "@/lib/domain/projects";
import { prisma } from "@/lib/prisma";

const runId = randomUUID();
const userId = randomUUID();
const externalReference = `TEST-${runId}`;
const costCenterCode = `T${runId.slice(0, 7)}`;
const projectCodeBase = `${Date.now()}${runId.replace(/\D/g, "")}`;
const privateProjectCode = `PRO-${projectCodeBase}1`;
const unusedProjectCode = `PRO-${projectCodeBase}2`;
const previousContactTaskCode = process.env.ZEEV_TASK_CONTACT_CODE;
const previousServiceTaskCode = process.env.ZEEV_TASK_SERVICE_CODE;
const previousApproveTaskCode = process.env.ZEEV_TASK_APPROVE_CODE;
const previousDeviationTaskCode = process.env.ZEEV_TASK_DEVIATION_CODE;

describe.runIf(Boolean(process.env.DATABASE_URL))(
  "fluxo integrado com PostgreSQL",
  () => {
    let ticketId = "";
    let costCenterId = "";
    let privateProjectId = "";

    beforeAll(async () => {
      process.env.ZEEV_CALLBACK_URL = "";
      process.env.ZEEV_TASK_CONTACT_CODE = "contact-test";
      process.env.ZEEV_TASK_SERVICE_CODE = "service-test";
      process.env.ZEEV_TASK_APPROVE_CODE = "approve-test";
      process.env.ZEEV_TASK_DEVIATION_CODE = "deviation-test";
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
          code: privateProjectCode,
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
      await prisma.projectHourlyRate.deleteMany({
        where: { manualProjectId: privateProjectId },
      });
      await prisma.auditEvent.deleteMany({ where: { actorId: userId } });
      await prisma.costCenter.deleteMany({ where: { id: costCenterId } });
      await prisma.manualProject.deleteMany({
        where: { id: privateProjectId },
      });
      await prisma.userRef.deleteMany({ where: { id: userId } });
      if (previousContactTaskCode === undefined) {
        delete process.env.ZEEV_TASK_CONTACT_CODE;
      } else {
        process.env.ZEEV_TASK_CONTACT_CODE = previousContactTaskCode;
      }
      if (previousServiceTaskCode === undefined) {
        delete process.env.ZEEV_TASK_SERVICE_CODE;
      } else {
        process.env.ZEEV_TASK_SERVICE_CODE = previousServiceTaskCode;
      }
      if (previousApproveTaskCode === undefined) {
        delete process.env.ZEEV_TASK_APPROVE_CODE;
      } else {
        process.env.ZEEV_TASK_APPROVE_CODE = previousApproveTaskCode;
      }
      if (previousDeviationTaskCode === undefined) {
        delete process.env.ZEEV_TASK_DEVIATION_CODE;
      } else {
        process.env.ZEEV_TASK_DEVIATION_CODE = previousDeviationTaskCode;
      }
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
      const deliveries = await Promise.all([
        receiveZeevTicket(payload),
        receiveZeevTicket(payload),
      ]);
      const first = deliveries.find((delivery) => !delivery.replay);
      const replay = deliveries.find((delivery) => delivery.replay);
      expect(first).toBeDefined();
      expect(replay).toBeDefined();
      ticketId = first!.ticket.id;
      expect(replay!.ticket.id).toBe(first!.ticket.id);
      expect(first!.ticket.costCenterId).toBe(costCenterId);
      expect(first!.ticket.status).toBe(TicketStatus.TRIAGE);

      // The API-level triage approval is covered separately. Advance this
      // end-to-end scenario to the post-triage state so it can exercise work,
      // resolution, evaluation and automatic time-entry consolidation.
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.IN_PROGRESS,
          assigneeId: userId,
          version: { increment: 1 },
        },
      });
      await prisma.syncExecution.create({
        data: {
          ticketId,
          idempotencyKey: `zeev:${externalReference}:triage:1`,
          event: "ticket.triage_approved",
          direction: SyncDirection.OUTBOUND,
          status: SyncStatus.SUCCEEDED,
          payload: { resolutionCycle: 1 },
        },
      });
    });

    it("consolida períodos uma vez e aceita finalização repetida", async () => {
      const contactMessage = "Contato realizado e atendimento iniciado.";
      const [period, replayStart] = await Promise.all([
        startTicketWork(ticketId, userId, `work:${runId}`, contactMessage),
        startTicketWork(ticketId, userId, `work:${runId}`, contactMessage),
      ]);
      expect(replayStart.id).toBe(period.id);
      await expect(
        prisma.ticketComment.findFirstOrThrow({
          where: { ticketId, body: contactMessage, internal: false },
        }),
      ).resolves.toMatchObject({ authorId: userId });
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
      expect(first.status).toBe(TicketStatus.WAITING_APPROVAL);
      expect(replay.id).toBe(first.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].durationSeconds).toBe(60);
      await expect(
        startTicketWork(ticketId, userId, `work-blocked:${runId}`),
      ).rejects.toThrow(
        "só pode ser iniciado ou retomado durante a etapa de atendimento",
      );

      const stageDeliveries = await Promise.all([
        receiveZeevStageReady({
          schemaVersion: "1.0",
          event: "ticket.stage_ready",
          idempotencyKey: `zeev:${runId}:approval-ready:1`,
          source: {
            system: "zeev",
            processName: "Abertura de Ticket T.I",
            instanceId: runId,
          },
          ticket: { externalReference },
          stage: "INTERNAL_APPROVAL",
        }),
        receiveZeevStageReady({
          schemaVersion: "1.0",
          event: "ticket.stage_ready",
          idempotencyKey: `zeev:${runId}:approval-ready:1`,
          source: {
            system: "zeev",
            processName: "Abertura de Ticket T.I",
            instanceId: runId,
          },
          ticket: { externalReference },
          stage: "INTERNAL_APPROVAL",
        }),
      ]);
      expect(
        stageDeliveries.filter((delivery) => delivery.replay),
      ).toHaveLength(1);
      const waitingApproval = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticketId },
      });
      const approved = await approveTicketConclusion({
        ticketId,
        userId,
        version: waitingApproval.version,
        requestKey: `zeev:${runId}:approve:1`,
      });
      expect(approved.status).toBe(TicketStatus.RESOLVED);
      const approvalReplay = await approveTicketConclusion({
        ticketId,
        userId,
        version: waitingApproval.version,
        requestKey: `zeev:${runId}:approve:replay`,
      });
      expect(approvalReplay.id).toBe(ticketId);
    });

    it("roteia avaliação baixa ao responsável em novo ciclo", async () => {
      const payload = {
        externalReference,
        externalId: `evaluation:${runId}`,
        score: 4,
        justification: "A falha voltou.",
        expectationMet: false,
      };
      const deliveries = await Promise.all([
        receiveZeevEvaluation(payload),
        receiveZeevEvaluation(payload),
      ]);
      const result = deliveries.find((delivery) => !delivery.replay)!;
      const replay = deliveries.find((delivery) => delivery.replay)!;
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

    it("sincroniza a revisão de desvio antes de solicitar nova avaliação", async () => {
      const stageDeliveries = await Promise.all([
        receiveZeevStageReady({
          schemaVersion: "1.0",
          event: "ticket.stage_ready",
          idempotencyKey: `zeev:${runId}:deviation-ready:2`,
          source: {
            system: "zeev",
            processName: "Abertura de Ticket T.I",
            instanceId: runId,
          },
          ticket: { externalReference },
          stage: "DEVIATION_REVIEW",
        }),
        receiveZeevStageReady({
          schemaVersion: "1.0",
          event: "ticket.stage_ready",
          idempotencyKey: `zeev:${runId}:deviation-ready:2`,
          source: {
            system: "zeev",
            processName: "Abertura de Ticket T.I",
            instanceId: runId,
          },
          ticket: { externalReference },
          stage: "DEVIATION_REVIEW",
        }),
      ]);
      expect(
        stageDeliveries.filter((delivery) => delivery.replay),
      ).toHaveLength(1);
      const current = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticketId },
      });
      const reviewed = await reviewTicketDeviation({
        ticketId,
        userId,
        action: "REQUEST_REEVALUATION",
        version: current.version,
        requestKey: `zeev:${runId}:deviation:2`,
      });
      expect(reviewed.status).toBe(TicketStatus.RESOLVED);

      const payload = {
        externalReference,
        externalId: `evaluation-cycle-2:${runId}`,
        score: 9,
        expectationMet: true,
      };
      const deliveries = await Promise.all([
        receiveZeevEvaluation(payload),
        receiveZeevEvaluation(payload),
      ]);
      const result = deliveries.find((delivery) => !delivery.replay)!;
      const replay = deliveries.find((delivery) => delivery.replay)!;
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

    it("inclui centros de custo no seletor da Jornada", async () => {
      const selectable = await listProjects(undefined, {
        includePrivateManual: true,
      });
      const selected = selectable.find(
        (project) => project.id === `cost-center:${costCenterId}`,
      );

      expect(selected).toMatchObject({
        kind: "cost-center",
        code: costCenterCode,
        billableByDefault: true,
      });
    });

    it("exibe no catálogo somente o valor-hora já vigente", async () => {
      const now = new Date();
      const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
      );
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      await prisma.projectHourlyRate.createMany({
        data: [
          {
            manualProjectId: privateProjectId,
            amountCents: 9_500,
            effectiveFrom: yesterday,
            createdById: userId,
          },
          {
            manualProjectId: privateProjectId,
            amountCents: 12_000,
            effectiveFrom: tomorrow,
            createdById: userId,
          },
        ],
      });

      const catalog = await listProjectCatalog({
        includePrivateManual: true,
        includeInactive: true,
      });
      const project = catalog.find(
        (item) => item.id === `manual:${privateProjectId}`,
      );

      expect(project).toMatchObject({
        hourlyRateCents: 9_500,
        hourlyRateEffectiveFrom: yesterday,
        latestHourlyRateEffectiveFrom: tomorrow,
      });
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
          code: unusedProjectCode,
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
