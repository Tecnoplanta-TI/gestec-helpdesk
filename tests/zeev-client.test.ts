import { describe, expect, it } from "vitest";

import {
  buildZeevOutboundRequest,
  buildZeevOutboundRequests,
} from "@/lib/domain/zeev-client";

describe("callback real do Zeev", () => {
  it("ao iniciar atendimento conclui o contato inicial", () => {
    process.env.ZEEV_TASK_CONTACT_CODE = "T02";
    process.env.ZEEV_CONTACT_RESULT = "Concluir";
    const request = buildZeevOutboundRequest({
      event: "ticket.contact_started",
      payload: { instanceId: "4321" },
      ticket: {
        externalInstanceId: "4321",
        zeevTaskCode: null,
        zeevAssignmentId: null,
        resolutionSummary: null,
      },
    });
    expect(request.path).toBe("/api/2/assignments/instance/4321/T02");
    expect(request.body).toMatchObject({ result: "Concluir" });
    expect(request.optional).toBe(true);
  });

  it("ao finalizar conclui o atendimento da TI", () => {
    process.env.ZEEV_TASK_SERVICE_CODE = "T10";
    process.env.ZEEV_SERVICE_RESULT = "Concluir";
    const request = buildZeevOutboundRequest({
      event: "ticket.resolved",
      payload: {
        instanceId: "4321",
        resolutionSummary: "Acesso restaurado.",
        comments: [{ author: "Caio", body: "Pasta mapeada." }],
      },
      ticket: {
        externalInstanceId: "4321",
        zeevTaskCode: null,
        zeevAssignmentId: null,
        resolutionSummary: "Acesso restaurado.",
      },
    });
    expect(request.method).toBe("PUT");
    expect(request.path).toBe("/api/2/assignments/instance/4321/T10");
    expect(request.body).toMatchObject({ result: "Concluir" });
  });

  it("a aprovação interna da TI também sai do inbox do Zeev", () => {
    process.env.ZEEV_TASK_APPROVE_CODE = "T12";
    process.env.ZEEV_APPROVE_RESULT = "Aprovar";
    const [request] = buildZeevOutboundRequests({
      event: "ticket.internal_approved",
      payload: { instanceId: "4321", resolutionSummary: "Acesso restaurado." },
      ticket: {
        externalInstanceId: "4321",
        zeevTaskCode: null,
        zeevAssignmentId: null,
        resolutionSummary: "Acesso restaurado.",
      },
    });
    expect(request.path).toBe("/api/2/assignments/instance/4321/T12");
    expect(request.body).toMatchObject({ result: "Aprovar" });
  });

  it("envia comentário externo como mensagem da instância", () => {
    const request = buildZeevOutboundRequest({
      event: "ticket.comment_added",
      payload: { instanceId: 99, author: "Caio", body: "Validar acesso." },
      ticket: {
        externalInstanceId: "99",
        zeevTaskCode: "T10",
        zeevAssignmentId: null,
        resolutionSummary: null,
      },
    });
    expect(request).toEqual({
      method: "POST",
      path: "/api/2/messages",
      body: {
        instanceId: 99,
        messageBody: "Caio: Validar acesso.",
        requesterCanSee: true,
      },
    });
  });
});
