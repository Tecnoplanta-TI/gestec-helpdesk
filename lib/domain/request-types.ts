export const kanbanColumns = [
  { type: "solicitacao", label: "Solicitação" },
  { type: "incidente", label: "Incidente" },
  { type: "melhoria", label: "Melhoria" },
  { type: "interrupcao_servico", label: "Interrupção de serviços" },
] as const;

export type KanbanType = (typeof kanbanColumns)[number]["type"];

export const requestTypeLabels: Record<KanbanType, string> = {
  solicitacao: "Solicitação",
  incidente: "Incidente",
  melhoria: "Melhoria",
  interrupcao_servico: "Interrupção de serviços",
};

export function normalizeRequestType(
  value: string | null | undefined,
): KanbanType {
  const normalized =
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase() ?? "";
  if (normalized.includes("incident")) return "incidente";
  if (normalized.includes("melhor")) return "melhoria";
  if (normalized.includes("interrup") || normalized.includes("indispon"))
    return "interrupcao_servico";
  return "solicitacao";
}

export function parseOptionalDate(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function slaState(
  deadline: Date | string | null | undefined,
  closed: boolean,
) {
  if (!deadline || closed)
    return { state: "none" as const, label: "Sem prazo registrado" };
  const due = new Date(deadline);
  const diffMs = due.getTime() - Date.now();
  if (diffMs < 0) {
    const hours = Math.max(1, Math.round(Math.abs(diffMs) / 3_600_000));
    return { state: "overdue" as const, label: `Fora do prazo · ${hours}h` };
  }
  const hours = Math.max(1, Math.round(diffMs / 3_600_000));
  return { state: "on_track" as const, label: `No prazo · ${hours}h` };
}
