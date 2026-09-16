import { describe, expect, it } from "vitest";

import { gestecCostCenters } from "../prisma/gestec-cost-centers.mjs";

const posterCodes = [
  "2",
  "3",
  "7",
  "17",
  "18",
  "19",
  "40",
  "93",
  "8",
  "9",
  "10",
  "12",
  "13",
  "14",
  "22",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "47",
  "48",
  "49",
  "4",
  "15",
  "50",
  "51",
  "52",
  "62",
  "16",
  "56",
  "57",
  "58",
  "94",
  "20",
  "21",
  "59",
  "61",
  "66",
  "300",
  "301",
  "302",
  "303",
  "304",
  "6",
  "33",
  "36",
  "5",
  "43",
  "45",
  "46",
  "54",
  "63",
  "65",
  "67",
  "68",
  "69",
];

describe("catálogo de centros de custo", () => {
  it("inclui todos os centros do guia rápido da Tecnoplanta", () => {
    const catalogCodes = new Set(
      gestecCostCenters.map((costCenter) => costCenter.code),
    );
    expect(posterCodes.every((code) => catalogCodes.has(code))).toBe(true);
  });

  it("usa os nomes oficiais do guia rápido", () => {
    const byCode = Object.fromEntries(
      gestecCostCenters.map((costCenter) => [costCenter.code, costCenter.name]),
    );

    expect(byCode["2"]).toBe("Viveiro RS");
    expect(byCode["5"]).toBe("Gente e Gestão");
    expect(byCode["19"]).toBe("Viveiro MS – Três Lagoas");
    expect(byCode["28"]).toBe("HF Papaleo I");
    expect(byCode["43"]).toBe("Contabilidade");
    expect(byCode["58"]).toBe("Piscicultura");
    expect(byCode["63"]).toBe("Recursos Humanos");
    expect(byCode["65"]).toBe("Tecnologia da Informação");
  });

  it("não possui códigos repetidos", () => {
    const codes = gestecCostCenters.map((costCenter) => costCenter.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
