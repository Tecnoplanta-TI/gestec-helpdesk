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
});
