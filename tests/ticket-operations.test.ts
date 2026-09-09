import { TicketStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { canTransition } from "@/lib/domain/operations";
import { normalizeRequestType } from "@/lib/domain/request-types";
import {
  parseTicketFilters,
  ticketSearchWhere,
} from "@/lib/domain/ticket-query";

describe("operações confirmadas de tickets", () => {
  it("normaliza tipos livres do Zeev para as colunas do Kanban", () => {
    expect(normalizeRequestType("Incidente")).toBe("incidente");
    expect(normalizeRequestType("Solicitação de acesso")).toBe("solicitacao");
    expect(normalizeRequestType("Melhoria contínua")).toBe("melhoria");
    expect(normalizeRequestType("Interrupção de serviços")).toBe(
      "interrupcao_servico",
    );
    expect(normalizeRequestType(undefined)).toBe("solicitacao");
  });

  it("bloqueia transições de status que o workflow não permite", () => {
    expect(canTransition(TicketStatus.NEW, TicketStatus.TRIAGE)).toBe(true);
    expect(
      canTransition(TicketStatus.IN_PROGRESS, TicketStatus.WAITING_REQUESTER),
    ).toBe(true);
    expect(canTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS)).toBe(
      false,
    );
    expect(canTransition(TicketStatus.CLOSED, TicketStatus.CANCELLED)).toBe(
      false,
    );
    expect(canTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(
      false,
    );
    expect(canTransition(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED)).toBe(
      false,
    );
  });

  it("busca por número apenas quando o termo é um inteiro positivo", () => {
    expect(ticketSearchWhere(parseTicketFilters({ q: "#12" })).OR).toEqual(
      expect.arrayContaining([{ number: 12 }]),
    );
    expect(ticketSearchWhere(parseTicketFilters({ q: "abc" })).OR).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ number: expect.anything() }),
      ]),
    );
  });

  it("normaliza paginação não finita em vez de repassar um skip inválido ao banco", () => {
    expect(parseTicketFilters({ page: "Infinity" }).page).toBe(1);
    expect(parseTicketFilters({ page: "-2" }).page).toBe(1);
  });
});
