import { TimeEntryStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { reportFilters } from "@/lib/domain/report-query";

describe("filtros de relatórios e exportação", () => {
  it("exclui apontamentos anulados e reaplica projeto e faturabilidade", () => {
    const params = new URLSearchParams({
      from: "2026-09-01",
      to: "2026-09-03",
      project: "cost-center:00000000-0000-4000-8000-000000000001",
      billable: "billable",
    });
    const result = reportFilters(params);
    expect(result.where).toMatchObject({
      status: { not: TimeEntryStatus.VOIDED },
      costCenterId: "00000000-0000-4000-8000-000000000001",
      billable: true,
    });
  });

  it("rejeita datas inválidas e períodos invertidos", () => {
    expect(() =>
      reportFilters(new URLSearchParams({ from: "inválida" })),
    ).toThrow("período válido");
    expect(() =>
      reportFilters(
        new URLSearchParams({ from: "2026-09-04", to: "2026-09-03" }),
      ),
    ).toThrow("data inicial");
  });

  it("recusa período maior que 366 dias", () => {
    expect(() =>
      reportFilters(
        new URLSearchParams({ from: "2024-01-01", to: "2026-01-01" }),
      ),
    ).toThrow("366 dias");
  });

  it("trata todos os usuários como filtro explícito sem restringir ao atual", () => {
    const result = reportFilters(
      new URLSearchParams({
        from: "2026-09-01",
        to: "2026-09-03",
        userId: "all",
      }),
    );

    expect(result.userId).toBe("");
    expect(result.where).not.toHaveProperty("userId");
  });

  it("mantém o filtro quando um usuário específico é escolhido", () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    const result = reportFilters(
      new URLSearchParams({
        from: "2026-09-01",
        to: "2026-09-03",
        userId,
      }),
    );

    expect(result.userId).toBe(userId);
    expect(result.where).toHaveProperty("userId", userId);
  });
});
