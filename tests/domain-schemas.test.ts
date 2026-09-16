import { describe, expect, it } from "vitest";

import { hasPermission } from "@/lib/auth/permissions";
import { ticketClassificationFields } from "@/lib/domain/ticket-classification";
import {
  commentSchema,
  costCenterUpdateSchema,
  manualTimeEntrySchema,
  normalizePriority,
  timerStopSchema,
  timerUpdateSchema,
  adminTicketCreateSchema,
  adminTicketUpdateSchema,
  adminTimeEntryCreateSchema,
  adminUserSchema,
  timeGoalSchema,
  zeevTicketSchema,
} from "@/lib/domain/schemas";

describe("contratos do domínio", () => {
  it("normaliza prioridades recebidas do Zeev", () => {
    expect(normalizePriority("Crítica")).toBe("CRITICAL");
    expect(normalizePriority("Alta")).toBe("HIGH");
    expect(normalizePriority("Baixa")).toBe("LOW");
    expect(normalizePriority(undefined)).toBe("MEDIUM");
  });

  it("rejeita lançamento manual com intervalo invertido", () => {
    const result = manualTimeEntrySchema.safeParse({
      description: "Atendimento",
      projectId: "cost-center:00000000-0000-4000-8000-000000000001",
      billable: true,
      startedAt: "2026-09-02T10:00:00-03:00",
      endedAt: "2026-09-02T09:00:00-03:00",
    });
    expect(result.success).toBe(false);
  });

  it("exige a versão conhecida do envelope Zeev", () => {
    const result = zeevTicketSchema.safeParse({
      schemaVersion: "2.0",
      event: "ticket.ready_for_service",
    });
    expect(result.success).toBe(false);
  });

  it("aceita instanceId numérico vindo do Zeev", () => {
    const result = zeevTicketSchema.safeParse({
      schemaVersion: "1.0",
      event: "ticket.ready_for_service",
      idempotencyKey: "zeev:4321:create",
      source: {
        system: "zeev",
        processName: "Abertura de Ticket T.I",
        instanceId: 4321,
        taskCode: "T10",
      },
      requester: { openedAt: "2026-09-02T16:00:00-03:00", name: "Ana" },
      ticket: { externalReference: 4321, summary: "Sem acesso ao e-mail" },
      formFields: [
        { name: "servico", value: "Acesso", row: 1 },
        { name: "sistemaIndisponivel", value: false, row: 1 },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source.instanceId).toBe("4321");
      expect(result.data.ticket.externalReference).toBe("4321");
      expect(result.data.formFields).toEqual([
        { name: "servico", value: "Acesso", row: 1 },
        { name: "sistemaIndisponivel", value: false, row: 1 },
      ]);
    }
  });

  it("aceita parada de timer sem chave gerada no cliente", () => {
    expect(
      timerStopSchema.safeParse({
        timerId: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
    expect(timerStopSchema.safeParse({}).success).toBe(true);
  });

  it("exige versão e ao menos um campo para atualizar o timer ativo", () => {
    expect(timerUpdateSchema.safeParse({}).success).toBe(false);
    expect(timerUpdateSchema.safeParse({ billable: false }).success).toBe(
      false,
    );
    expect(
      timerUpdateSchema.safeParse({ billable: false, version: 1 }).success,
    ).toBe(true);
  });

  it("exige chave de requisição no comentário e alteração no centro de custo", () => {
    expect(
      commentSchema.safeParse({ body: "Atualização do atendimento" }).success,
    ).toBe(false);
    expect(
      commentSchema.safeParse({
        body: "Atualização do atendimento",
        requestKey: "comment-key-1",
      }).success,
    ).toBe(true);
    expect(costCenterUpdateSchema.safeParse({}).success).toBe(false);
    expect(costCenterUpdateSchema.safeParse({ name: "TI" }).success).toBe(true);
  });

  it("permite ao gestor iniciar o próprio timer", () => {
    expect(hasPermission("MANAGER", "time:write")).toBe(true);
    expect(hasPermission("AUDITOR", "time:write")).toBe(false);
  });

  it("reserva o painel admin ao administrador", () => {
    expect(hasPermission("ADMIN", "admin:manage")).toBe(true);
    expect(hasPermission("MANAGER", "admin:manage")).toBe(false);
    expect(hasPermission("TECHNICIAN", "admin:manage")).toBe(false);
    expect(hasPermission("AUDITOR", "admin:manage")).toBe(false);
  });

  it("permite ajuste administrativo de ticket resolvido", () => {
    expect(
      adminTicketUpdateSchema.safeParse({
        status: "RESOLVED",
        resolutionSummary: "Correção manual da solução",
        reason: "Ajuste de cadastro",
        version: 3,
      }).success,
    ).toBe(true);
    expect(
      adminUserSchema.safeParse({
        name: "Ana",
        email: "ana@gestec.invalid",
        externalId: "ana",
        role: "TECHNICIAN",
      }).success,
    ).toBe(true);
  });

  it("aceita criação administrativa de ticket e apontamento", () => {
    expect(
      adminTicketCreateSchema.safeParse({
        title: "Acesso à pasta",
        description: "Usuário sem mapeamento",
        requesterName: "Ana",
        priority: "HIGH",
      }).success,
    ).toBe(true);
    expect(
      adminTimeEntryCreateSchema.safeParse({
        userId: "00000000-0000-4000-8000-000000000001",
        description: "Atendimento",
        projectId: "cost-center:00000000-0000-4000-8000-000000000001",
        billable: true,
        startedAt: "2026-09-03T10:00:00-03:00",
        endedAt: "2026-09-03T11:00:00-03:00",
      }).success,
    ).toBe(true);
  });

  it("aceita metas permanentes sem data final e exige fim em metas temporárias", () => {
    const baseGoal = {
      title: "Meta contínua",
      targetSeconds: 8 * 60 * 60,
      startsOn: "2026-09-11",
      targetUserId: "00000000-0000-4000-8000-000000000001",
    };

    expect(
      timeGoalSchema.safeParse({
        ...baseGoal,
        permanent: true,
        endsOn: null,
      }).success,
    ).toBe(true);
    expect(
      timeGoalSchema.safeParse({
        ...baseGoal,
        permanent: false,
        endsOn: null,
      }).success,
    ).toBe(false);
    expect(
      timeGoalSchema.safeParse({
        ...baseGoal,
        permanent: true,
        endsOn: "2026-09-30",
      }).success,
    ).toBe(false);
  });

  it("limita metas diárias a 24 horas", () => {
    expect(
      timeGoalSchema.safeParse({
        title: "Meta diária",
        targetSeconds: 24 * 60 * 60 + 1,
        startsOn: "2026-09-11",
        endsOn: null,
        permanent: true,
        targetUserId: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
  });

  it("aceita somente metas configuradas por dia", () => {
    expect(
      timeGoalSchema.safeParse({
        title: "Meta diária",
        targetSeconds: 8 * 60 * 60,
        period: "MONTHLY",
        startsOn: "2026-09-11",
        endsOn: null,
        permanent: true,
        targetUserId: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
  });

  it("expõe somente os campos adicionais previstos para a classificação", () => {
    expect(
      ticketClassificationFields({
        requestType: "Solicitação",
        serviceGroup: "Zeev",
      }),
    ).toEqual({ showApplicationOrProcess: true, showAssetCode: false });
    expect(
      ticketClassificationFields({
        requestType: "Interrupção de serviços",
        serviceGroup: "Rede / Internet",
      }),
    ).toEqual({ showApplicationOrProcess: false, showAssetCode: true });
    expect(
      ticketClassificationFields({
        requestType: "Solicitação",
        serviceGroup: "Aquisição / Alocação",
      }),
    ).toEqual({ showApplicationOrProcess: false, showAssetCode: true });
  });
});
