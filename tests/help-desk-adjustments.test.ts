import { describe, expect, it } from "vitest";

import { appendRateioShare } from "@/lib/domain/rateio-draft";
import { rankProjectQuery } from "@/lib/domain/project-search";
import {
  adminTimeEntryDeleteSchema,
  adminTimeEntryUpdateSchema,
  optionalCorrectionReasonSchema,
} from "@/lib/domain/schemas";
import { displayPersonName } from "@/lib/format";

describe("edição de apontamento sem motivo", () => {
  const base = {
    description: "Atendimento",
    version: 1,
  };

  it("aceita edição sem motivo", () => {
    expect(optionalCorrectionReasonSchema.safeParse(undefined).success).toBe(
      true,
    );
    expect(optionalCorrectionReasonSchema.safeParse("").success).toBe(true);
    expect(adminTimeEntryUpdateSchema.safeParse(base).success).toBe(true);
  });

  it("mantém a validação quando o motivo é informado", () => {
    expect(optionalCorrectionReasonSchema.safeParse("ok").success).toBe(false);
    expect(
      adminTimeEntryUpdateSchema.safeParse({
        ...base,
        correctionReason: "Ajuste de horário",
      }).success,
    ).toBe(true);
  });

  it("rejeita término anterior ao início", () => {
    const result = adminTimeEntryUpdateSchema.safeParse({
      ...base,
      startedAt: "2026-09-02T10:00:00-03:00",
      endedAt: "2026-09-02T09:00:00-03:00",
    });
    expect(result.success).toBe(false);
  });

  it("continua exigindo motivo para excluir", () => {
    expect(
      adminTimeEntryDeleteSchema.safeParse({
        version: 1,
      }).success,
    ).toBe(false);
    expect(
      adminTimeEntryDeleteSchema.safeParse({
        version: 1,
        correctionReason: "Lançamento duplicado",
      }).success,
    ).toBe(true);
  });
});

describe("rateio manual", () => {
  it("não altera percentuais existentes ao adicionar uma linha", () => {
    const current = appendRateioShare([]);
    current[0] = { ...current[0], percent: "70" };
    const next = appendRateioShare(current);
    expect(next[0]?.percent).toBe("70");
    expect(next[1]?.percent).toBe("");
    expect(next[0]?.id).not.toBe(next[1]?.id);
  });
});

describe("busca de projeto", () => {
  const projects = [
    "Portal legado",
    "Gestec",
    "Suporte Gestec interno",
    "Gestec Plataforma",
  ];

  it("coloca a correspondência mais próxima no topo", () => {
    const ranked = [...projects].sort(
      (left, right) =>
        rankProjectQuery("gestec", right, [right]) -
        rankProjectQuery("gestec", left, [left]),
    );
    expect(ranked[0]).toBe("Gestec");
    expect(ranked.at(-1)).not.toBe("Gestec");
    expect(rankProjectQuery("gestec", "Portal legado", ["Portal legado"])).toBe(
      0,
    );
  });
});

describe("rótulo de pessoa", () => {
  it("não exibe vazio, undefined ou UUID", () => {
    expect(displayPersonName("", "ana@gestec.io")).toBe("ana@gestec.io");
    expect(displayPersonName("undefined", null)).toBe("Usuário sem nome");
    expect(displayPersonName(null, "null")).toBe("Usuário sem nome");
  });
});
