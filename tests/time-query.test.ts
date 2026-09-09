import { describe, expect, it } from "vitest";

import {
  composeProjectId,
  groupTimeEntriesByDay,
  parseTimeFilters,
  summarizeTimeEntries,
  timerStopIdempotencyKey,
} from "@/lib/domain/time-query";
import {
  DAILY_GOAL_SECONDS,
  goalProgressPercent,
  monthlyGoalSeconds,
} from "@/lib/domain/time-goals";
import { formatGoalOffset, formatHoursMinutes } from "@/lib/format";

describe("filtros e totais de Meu Tempo", () => {
  it("normaliza a semana para segunda-feira e ignora projeto inválido", () => {
    const filters = parseTimeFilters(
      {
        from: "2026-09-02",
        project: "invalido",
        billable: "billable",
        ticket: "4321",
      },
      new Date("2026-09-02T15:00:00"),
    );
    expect(filters.weekStart.getDay()).toBe(1);
    expect(filters.projectId).toBeUndefined();
    expect(filters.billable).toBe("billable");
    expect(filters.ticket).toBe("4321");
  });

  it("aceita o identificador estável do projeto no filtro", () => {
    const filters = parseTimeFilters({
      project: "cost-center:00000000-0000-4000-8000-000000000001",
    });
    expect(filters.projectId).toBe(
      "cost-center:00000000-0000-4000-8000-000000000001",
    );
  });

  it("totaliza a semana com os mesmos registros da lista e separa faturável", () => {
    const totals = summarizeTimeEntries([
      {
        durationSeconds: 3600,
        billable: true,
        projectNameSnapshot: "Financeiro",
        status: "VALID",
      },
      {
        durationSeconds: 1800,
        billable: false,
        projectNameSnapshot: null,
        status: "PENDING_CLASSIFICATION",
      },
    ]);
    expect(totals.week).toBe(5400);
    expect(totals.billable).toBe(3600);
    expect(totals.nonBillable).toBe(1800);
    expect(totals.byProject[0]?.project).toBe("Financeiro");
    expect(
      totals.byProject.find(
        (item) => item.project === "Pendente de classificação",
      )?.seconds,
    ).toBe(1800);
  });

  it("deriva a chave idempotente da parada a partir do timer", () => {
    expect(timerStopIdempotencyKey("timer-1")).toBe("timer-stop:timer-1");
    expect(
      composeProjectId({ costCenterId: "cc-1", manualProjectId: null }),
    ).toBe("cost-center:cc-1");
  });

  it("ordena apontamentos do dia do maior para o menor", () => {
    const grouped = groupTimeEntriesByDay([
      {
        startedAt: "2026-09-03T10:00:00",
        durationSeconds: 600,
      },
      {
        startedAt: "2026-09-03T14:00:00",
        durationSeconds: 3600,
      },
      {
        startedAt: "2026-09-02T09:00:00",
        durationSeconds: 1800,
      },
    ]);
    expect(grouped[0]?.[1][0]?.durationSeconds).toBe(3600);
    expect(grouped[0]?.[1][1]?.durationSeconds).toBe(600);
  });
});

describe("metas da Jornada", () => {
  it("calcula a meta mensal em dias úteis de 6 horas", () => {
    expect(monthlyGoalSeconds(new Date("2026-09-03T12:00:00"))).toBe(
      22 * DAILY_GOAL_SECONDS,
    );
    expect(goalProgressPercent(10800, DAILY_GOAL_SECONDS)).toBe(50);
  });

  it("formata as boxes de hoje e meta", () => {
    expect(formatHoursMinutes(5 * 3600 + 20 * 60)).toBe("05h 20m");
    expect(formatGoalOffset(5 * 3600 + 20 * 60, DAILY_GOAL_SECONDS)).toBe(
      "- 0:40 / 6:00",
    );
  });
});
