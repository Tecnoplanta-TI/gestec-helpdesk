export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function formatHoursMinutes(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatCurrencyFromCents(value: number | null | undefined) {
  if (value === null || value === undefined) return "Não informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export function formatClockMinutes(totalSeconds: number) {
  const seconds = Math.abs(Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function formatGoalOffset(actualSeconds: number, goalSeconds: number) {
  const delta = actualSeconds - goalSeconds;
  const sign = delta >= 0 ? "+" : "-";
  return `${sign} ${formatClockMinutes(delta)} / ${formatClockMinutes(goalSeconds)}`;
}

export const ticketStatusLabels: Record<string, string> = {
  NEW: "Novo",
  TRIAGE: "Triagem",
  IN_PROGRESS: "Em atendimento",
  WAITING_REQUESTER: "Aguardando solicitante",
  WAITING_APPROVAL: "Aguardando aprovação",
  RESOLVED: "Resolvido",
  CLOSED: "Concluído",
  REOPENED_LOW_SCORE: "Reaberto por avaliação",
  CANCELLED: "Cancelado",
};

export const ticketPriorityLabels: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const userRoleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  TECHNICIAN: "Técnico",
  AUDITOR: "Auditor",
};

export const timeEntryStatusLabels: Record<string, string> = {
  VALID: "Válido",
  PENDING_CLASSIFICATION: "Pendente de classificação",
  VOIDED: "Invalidado",
};

export const timeEntrySourceLabels: Record<string, string> = {
  TIMER: "Timer",
  MANUAL: "Manual",
  TICKET: "Ticket",
};

export function toDatetimeLocalValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const ticketHistoryLabels: Record<string, string> = {
  RECEIVED_FROM_ZEEV: "Recebido do Zeev",
  INITIAL_CONTACT_RECORDED: "Contato inicial registrado",
  ZEEV_STAGE_READY: "Etapa pronta no Zeev",
  INTERNAL_APPROVAL_CONFIRMED: "Conclusão aprovada pela TI",
  DEVIATION_REVIEWED: "Desvio revisado pela TI",
  WORK_STARTED: "Atendimento iniciado",
  WORK_STOPPED: "Atendimento pausado",
  RESOLVED_IN_HELP_DESK: "Finalizado no Help Desk",
  LOW_SCORE_REOPENED: "Reaberto por avaliação baixa",
  EVALUATION_ACCEPTED: "Avaliação aceita",
  TICKET_UPDATED: "Ticket atualizado",
  ASSIGNEE_CHANGED: "Responsável alterado",
  PARTICIPANT_ADDED: "Colaborador adicionado",
  PARTICIPANT_REMOVED: "Colaborador removido",
  ATTACHMENT_ADDED: "Anexo adicionado",
  ATTACHMENT_REMOVED: "Anexo removido",
  ASSET_LINKED: "Ativo vinculado",
  ASSET_UNLINKED: "Ativo desvinculado",
  PRIORITY_CHANGED: "Prioridade alterada",
  STATUS_CHANGED: "Status alterado",
  COMMENT_ADDED: "Comentário enviado ao Zeev",
  INTERNAL_COMMENT_ADDED: "Nota interna registrada",
  ADMIN_TICKET_UPDATED: "Ajuste administrativo",
  ADMIN_TICKET_CREATED: "Ticket criado no admin",
};
