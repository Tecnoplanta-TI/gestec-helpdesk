/**
 * Valores de enum usados por componentes do navegador.
 *
 * Não importe enums de `@prisma/client` em componentes client-side: o entry
 * point de browser do Prisma não publica esses valores de modo confiável.
 * Estes objetos espelham `prisma/schema.prisma` e mantêm o bundle do cliente
 * independente do runtime do Prisma.
 */
function defineEnum<const T extends Record<string, string>>(values: T) {
  return values;
}

export const AssetStatus = defineEnum({
  IN_STOCK: "IN_STOCK",
  IN_USE: "IN_USE",
  MAINTENANCE: "MAINTENANCE",
  RETIRED: "RETIRED",
});
export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

export const ParticipantRole = defineEnum({
  PRIMARY: "PRIMARY",
  ADDITIONAL: "ADDITIONAL",
  OBSERVER: "OBSERVER",
});
export type ParticipantRole =
  (typeof ParticipantRole)[keyof typeof ParticipantRole];

export const TicketAssetRelation = defineEnum({
  CONTEXT: "CONTEXT",
  DELIVERED: "DELIVERED",
});
export type TicketAssetRelation =
  (typeof TicketAssetRelation)[keyof typeof TicketAssetRelation];

export const TicketPriority = defineEnum({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});
export type TicketPriority =
  (typeof TicketPriority)[keyof typeof TicketPriority];

export const TicketStatus = defineEnum({
  NEW: "NEW",
  TRIAGE: "TRIAGE",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_REQUESTER: "WAITING_REQUESTER",
  WAITING_APPROVAL: "WAITING_APPROVAL",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  REOPENED_LOW_SCORE: "REOPENED_LOW_SCORE",
  CANCELLED: "CANCELLED",
});
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TimeEntrySource = defineEnum({
  TIMER: "TIMER",
  MANUAL: "MANUAL",
  TICKET: "TICKET",
});
export type TimeEntrySource =
  (typeof TimeEntrySource)[keyof typeof TimeEntrySource];

export const TimeEntryStatus = defineEnum({
  VALID: "VALID",
  PENDING_CLASSIFICATION: "PENDING_CLASSIFICATION",
  VOIDED: "VOIDED",
});
export type TimeEntryStatus =
  (typeof TimeEntryStatus)[keyof typeof TimeEntryStatus];

export const UserRole = defineEnum({
  ADMIN: "ADMIN",
  TECHNICIAN: "TECHNICIAN",
  MANAGER: "MANAGER",
  AUDITOR: "AUDITOR",
});
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
