import { describe, expect, it } from "vitest";

import {
  allocationsToShares,
  allocateSeconds,
  nextManualProjectCode,
} from "@/lib/domain/project-rateio";
import { includeRateioProjects } from "@/lib/domain/report-query";
import { toTimeProjects } from "@/lib/domain/projects";
import { manualProjectSchema } from "@/lib/domain/schemas";
import {
  displayPersonName,
  formatCatalogLabel,
  formatRateioSummary,
} from "@/lib/format";

const CC_A = "00000000-0000-4000-8000-000000000001";
const CC_B = "00000000-0000-4000-8000-000000000002";

describe("rateio e código automático de projetos", () => {
  it("gera o próximo código PRO com 4 dígitos", async () => {
    const client = {
      manualProject: {
        findMany: async () => [{ code: "PRO-0007" }, { code: "PRO-12" }],
      },
    };
    expect(await nextManualProjectCode(client)).toBe("PRO-0013");
  });

  it("converte 50/50 em milésimos que somam 100%", () => {
    expect(
      allocationsToShares([
        { costCenterId: CC_A, percent: 50 },
        { costCenterId: CC_B, percent: 50 },
      ]),
    ).toEqual([
      { costCenterId: CC_A, shareBps: 5000 },
      { costCenterId: CC_B, shareBps: 5000 },
    ]);
  });

  it("rejeita rateio que não fecha 100%", () => {
    expect(() =>
      allocationsToShares([{ costCenterId: CC_A, percent: 40 }]),
    ).toThrow("100%");
  });

  it("reparte segundos sem perder o residual", () => {
    const allocated = allocateSeconds(100, [
      { costCenterId: CC_A, shareBps: 3333 },
      { costCenterId: CC_B, shareBps: 6667 },
    ]);
    expect(allocated.reduce((sum, share) => sum + share.seconds, 0)).toBe(100);
  });

  it("aceita projeto sem código informado", () => {
    const result = manualProjectSchema.safeParse({
      name: "Viveiro piloto",
      color: "#10b981",
      allocations: [
        { costCenterId: CC_A, percent: 50 },
        { costCenterId: CC_B, percent: 50 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("inclui projetos rateados no filtro de centro de custo", () => {
    const where = includeRateioProjects(
      {
        status: { not: "VOIDED" },
        costCenterId: CC_A,
      },
      CC_A,
      ["11111111-1111-4111-8111-111111111111"],
    );
    expect(where).toMatchObject({
      AND: [
        { status: { not: "VOIDED" } },
        {
          OR: [
            { costCenterId: CC_A },
            {
              manualProjectId: {
                in: ["11111111-1111-4111-8111-111111111111"],
              },
            },
          ],
        },
      ],
    });
  });
});

describe("rótulos amigáveis", () => {
  it("não exibe UUID no lugar do nome", () => {
    expect(
      displayPersonName(
        "61d3f82c-4c56-45b4-997b-df0ca00afdf7",
        "ana.souza@tecnoplanta.com",
      ),
    ).toBe("ana.souza@tecnoplanta.com");
    expect(displayPersonName("Ana Souza", "ana.souza@tecnoplanta.com")).toBe(
      "Ana Souza",
    );
  });

  it("formata centro de custo e rateio", () => {
    expect(formatCatalogLabel("2", "Viveiro Matriz")).toBe(
      "2 · Viveiro Matriz",
    );
    expect(
      formatRateioSummary([
        { shareBps: 5000, code: "2", name: "Viveiro Matriz" },
        { shareBps: 5000, code: "6", name: "Veículos Pesados" },
      ]),
    ).toBe("50% 2 · Viveiro Matriz; 50% 6 · Veículos Pesados");
  });
});

describe("seletor de centro de custo e projeto", () => {
  it("prefixa centros de custo e reaproveita ids manuais já compostos", () => {
    const projects = toTimeProjects(
      [
        { id: CC_A, code: "2", name: "Viveiro Matriz" },
        { id: CC_B, code: "10", name: "Administrativo" },
      ],
      [
        {
          id: `manual:${CC_A}`,
          name: "Demandas do Setor",
          code: "PRO-0001",
          billableByDefault: false,
        },
      ],
    );

    expect(projects.map((project) => project.id)).toEqual([
      `cost-center:${CC_A}`,
      `cost-center:${CC_B}`,
      `manual:${CC_A}`,
    ]);
    expect(projects[0]).toMatchObject({
      kind: "cost-center",
      name: "Viveiro Matriz",
      code: "2",
    });
    expect(projects[2]).toMatchObject({
      kind: "manual",
      name: "Demandas do Setor",
      billableByDefault: false,
    });
  });
});
