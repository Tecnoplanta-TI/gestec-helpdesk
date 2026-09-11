import { describe, expect, it } from "vitest";

import {
  buildZeevOutboundRequest,
  buildZeevOutboundRequests,
  missingRequiredTriageFormFields,
} from "@/lib/domain/zeev-client";

describe("callback real do Zeev", () => {
  const formFields = [
    { name: "servico", value: "Acesso", row: 1 },
    { name: "prioridade", value: "Alta", row: 1 },
  ];

  it("aprova a triagem no Zeev a partir do Help Desk", () => {
    process.env.ZEEV_TASK_TRIAGE_CODE = "triagem";
    process.env.ZEEV_TRIAGE_RESULT = "Aprovar";
    const request = buildZeevOutboundRequest({
      event: "ticket.triage_approved",
      payload: { instanceId: "4321", reason: "Classificação conferida." },
      ticket: {
        externalInstanceId: "4321",
        zeevTaskCode: null,
        zeevAssignmentId: null,
        resolutionSummary: null,
      },
      formFields,
    });
    expect(request.path).toBe("/api/2/assignments/instance/4321/triagem");
    expect(request.body).toMatchObject({
      result: "Aprovar",
      reason: "Classificação conferida.",
      formFields,
    });
    expect(request.optional).toBeUndefined();
  });

  it("identifica os campos obrigatórios vazios antes de chamar o Zeev", () => {
    expect(
      missingRequiredTriageFormFields([
        { name: "servico", value: "Acesso", row: 1 },
        { name: "nivel", value: "Padrão", row: 1 },
        { name: "responsavel", value: "Caio", row: 1 },
        { name: "tipoSolicitacao", value: "Solicitação", row: 1 },
      ]),
    ).toEqual([]);
    expect(
      missingRequiredTriageFormFields([
        { name: "servico", value: "", row: 1 },
        { name: "sistemaIndisponivel", value: false, row: 1 },
        { name: "tipoSolicitacao", value: "Solicitação", row: 1 },
      ]),
    ).toEqual(["servico", "nivel", "responsavel"]);
    expect(
      missingRequiredTriageFormFields([
        { name: "servico", value: "Acesso", row: 1 },
        { name: "nivel", value: "Padrão", row: 1 },
        { name: "responsavel", value: "Caio", row: 1 },
        { name: "tipoSolicitacao", value: "Incidente", row: 1 },
      ]),
    ).toEqual(["sistemaIndisponivel", "infraestruturaInoperante"]);
  });

  it("ao registrar o contato inicial envia a informação e conclui a tarefa", () => {
    process.env.ZEEV_TASK_CONTACT_CODE = "T02";
    process.env.ZEEV_CONTACT_RESULT = "Concluir";
    const request = buildZeevOutboundRequest({
      event: "ticket.contact_started",
      payload: {
        instanceId: "4321",
        contactMessage:
          "Solicitante confirmou que o acesso continua indisponível.",
      },
      ticket: {
        externalInstanceId: "4321",
        zeevTaskCode: null,
        zeevAssignmentId: null,
        resolutionSummary: null,
      },
      formFields,
    });
    expect(request.path).toBe("/api/2/assignments/instance/4321/T02");
    expect(request.body).toMatchObject({
      result: "Concluir",
      reason: "Solicitante confirmou que o acesso continua indisponível.",
      messages: [
        {
          messageBody:
            "Contato inicial registrado pelo Help Desk:\nSolicitante confirmou que o acesso continua indisponível.",
          requesterCanSee: true,
        },
      ],
      formFields,
    });
    expect(request.optional).toBeUndefined();
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
      formFields,
    });
    expect(request.method).toBe("PUT");
    expect(request.path).toBe("/api/2/assignments/instance/4321/T10");
    expect(request.body).toMatchObject({ result: "Concluir", formFields });
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
      formFields,
    });
    expect(request.path).toBe("/api/2/assignments/instance/4321/T12");
    expect(request.body).toMatchObject({ result: "Aprovar", formFields });
  });

  it("envia a decisão de desvio para a tarefa correta no Zeev", () => {
    process.env.ZEEV_TASK_DEVIATION_CODE = "T14";
    process.env.ZEEV_DEVIATION_RETRY_RESULT = "Avaliar ticket novamente";
    const request = buildZeevOutboundRequest({
      event: "ticket.deviation_reviewed",
      payload: { instanceId: "4321", action: "REQUEST_REEVALUATION" },
      ticket: {
        externalInstanceId: "4321",
        zeevTaskCode: null,
        zeevAssignmentId: null,
        resolutionSummary: null,
      },
      formFields,
    });
    expect(request.path).toBe("/api/2/assignments/instance/4321/T14");
    expect(request.body).toMatchObject({
      result: "Avaliar ticket novamente",
      formFields,
    });
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
