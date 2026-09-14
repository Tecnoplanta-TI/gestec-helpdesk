import { describe, expect, it } from "vitest";

import { currentLocalDateValue, formatDateOnly } from "@/lib/format";

describe("date-only formatting", () => {
  it("preserves the calendar day from an ISO UTC value", () => {
    expect(formatDateOnly("2026-09-11T00:00:00.000Z")).toBe("11/09/2026");
  });

  it("builds date input values from local calendar parts", () => {
    const date = new Date(2026, 8, 11, 23, 59, 59);
    expect(currentLocalDateValue(date)).toBe("2026-09-11");
  });

  it("does not throw for an invalid date", () => {
    expect(formatDateOnly("not-a-date")).toBe("Data inválida");
  });
});
