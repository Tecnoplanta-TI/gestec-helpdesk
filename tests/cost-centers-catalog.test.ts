import { describe, expect, it } from "vitest";

import { gestecCostCenters } from "../prisma/gestec-cost-centers.mjs";

describe("catálogo de centros de custo", () => {
  it("inclui todos os centros da lista operacional recebida", () => {
    const requiredCodes = [
      "2", "3", "7", "17", "18", "19", "40", "93",
      "8", "9", "10", "12", "13", "14", "22", "25", "26", "27",
      "28", "29", "30", "31", "47", "48", "49",
      "4", "15", "50", "51", "52", "62",
      "16", "56", "57", "58", "94",
      "20", "21", "59", "61", "66",
      "300", "301", "302", "303", "304",
      "6", "33", "36",
      "5", "42", "45", "46", "54", "63", "65", "67", "68", "69",
    ];

    const catalogCodes = new Set(
      gestecCostCenters.map((costCenter) => costCenter.code),
    );
    expect(requiredCodes.every((code) => catalogCodes.has(code))).toBe(true);
  });

  it("não possui códigos repetidos", () => {
    const codes = gestecCostCenters.map((costCenter) => costCenter.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
