import {
  AssetStatus,
  ParticipantRole,
  TicketAssetRelation,
  TicketPriority,
  TicketStatus,
  TimeEntrySource,
  TimeEntryStatus,
  UserRole,
} from "@prisma/client";
import { z } from "zod";

const uuid = z.string().uuid();
const nonEmpty = z.string().trim().min(1).max(500);

export const zeevTicketSchema = z.object({
  schemaVersion: z.literal("1.0"),
  event: z.literal("ticket.ready_for_service"),
  idempotencyKey: z.string().trim().min(8).max(200),
  source: z.object({
    system: z.literal("zeev"),
    processName: nonEmpty,
    instanceId: z.coerce.string().trim().min(1).max(80),
    assignmentId: z.coerce.string().trim().min(1).max(80).optional(),
    taskCode: z.string().trim().min(1).max(40).optional(),
    instanceUrl: z.string().url().optional().or(z.literal("")),
  }),
  requester: z.object({
    openedAt: z.coerce.date(),
    name: nonEmpty,
  }),
  ticket: z.object({
    externalReference: z.coerce.string().trim().min(1).max(500),
    requestType: z.string().trim().optional(),
    costCenter: z
      .object({ sourceValue: z.string().trim().optional() })
      .optional(),
    service: z.string().trim().optional(),
    priority: z.string().trim().optional(),
    serviceLevel: z.string().trim().optional(),
    serviceGroup: z.string().trim().optional(),
    applicationOrProcess: z.string().trim().optional(),
    assetCode: z.string().trim().optional(),
    summary: nonEmpty,
    supportNotes: z.string().trim().optional(),
    downtimeMinutes: z.string().trim().optional(),
    systemUnavailable: z.string().trim().optional(),
    infrastructureInoperable: z.string().trim().optional(),
    improvementAcknowledged: z.string().trim().optional(),
  }),
  assignment: z
    .object({
      triageResponsible: z.string().trim().optional(),
      serviceResponsible: z.string().trim().optional(),
      initialContactDeadline: z.string().trim().optional(),
      serviceDeadline: z.string().trim().optional(),
      applicationManager: z.string().trim().optional(),
      applicationManagerCode: z.string().trim().optional(),
    })
    .optional(),
  // Campos do formulário Zeev que precisam ser reapresentados quando uma
  // atividade é concluída pela API. O Zeev revalida os obrigatórios em cada
  // avanço do fluxo, mesmo quando eles foram preenchidos pelo solicitante.
  formFields: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        value: z
          .union([
            z.string().max(20_000),
            z.number().finite(),
            z.boolean(),
            z.null(),
          ])
          .optional(),
        row: z.number().int().positive().max(10_000).default(1),
      }),
    )
    .max(300)
    .optional(),
});

export const zeevStageReadySchema = z.object({
  schemaVersion: z.literal("1.0"),
  event: z.literal("ticket.stage_ready"),
  idempotencyKey: z.string().trim().min(8).max(200),
  source: z.object({
    system: z.literal("zeev"),
    processName: nonEmpty,
    instanceId: z.coerce.string().trim().min(1).max(80),
  }),
  ticket: z.object({
    externalReference: z.coerce.string().trim().min(1).max(500),
  }),
  stage: z.enum([
    "INTERNAL_APPROVAL",
    "REQUESTER_VALIDATION",
    "DEVIATION_REVIEW",
  ]),
});

export const ticketUpdateSchema = z
  .object({
    status: z.nativeEnum(TicketStatus).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    assigneeId: uuid.nullable().optional(),
    costCenterId: uuid.nullable().optional(),
    catalogServiceId: uuid.nullable().optional(),
    requestType: z.string().trim().max(80).optional(),
    service: z.string().trim().max(200).nullable().optional(),
    serviceGroup: z.string().trim().max(200).nullable().optional(),
    applicationOrProcess: z.string().trim().max(200).nullable().optional(),
    assetCode: z.string().trim().max(80).nullable().optional(),
    resolutionSummary: z.string().trim().min(3).max(4000).optional(),
    reason: z.string().trim().min(3).max(500).optional(),
    version: z.number().int().positive(),
  })
  .refine(
    (value) =>
      Object.keys(value).some((key) => key !== "version" && key !== "reason"),
    {
      message: "Informe ao menos uma alteração.",
    },
  );

export const assignTicketSchema = z.object({
  assigneeId: uuid.nullable(),
  reason: z.string().trim().min(3).max(500),
  version: z.number().int().positive(),
});

export const approveTriageSchema = z.object({
  assigneeId: uuid,
  reason: z.string().trim().max(1000).optional(),
  checklist: z.object({
    classificationConfirmed: z.literal(true),
    assignmentConfirmed: z.literal(true),
  }),
  version: z.number().int().positive(),
  requestKey: z.string().trim().min(8).max(200),
});

export const approveConclusionSchema = z.object({
  version: z.number().int().positive(),
  requestKey: z.string().trim().min(8).max(200),
});

export const deviationReviewSchema = z.object({
  action: z.enum(["REQUEST_REEVALUATION", "CLOSE_TICKET"]),
  version: z.number().int().positive(),
  requestKey: z.string().trim().min(8).max(200),
});

export const participantSchema = z.object({
  userId: uuid,
  role: z.nativeEnum(ParticipantRole).default(ParticipantRole.ADDITIONAL),
});

export const ticketAssetSchema = z.object({
  assetId: uuid,
  relationType: z
    .nativeEnum(TicketAssetRelation)
    .default(TicketAssetRelation.CONTEXT),
});

export const ticketBatchSchema = z.object({
  action: z.enum(["assign", "priority", "transition"]),
  ticketIds: z.array(uuid).min(1).max(50),
  requestKey: z.string().trim().min(8).max(200),
  reason: z.string().trim().min(3).max(500),
  assigneeId: uuid.nullable().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
});

export const serviceGroupSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(160),
  active: z.boolean().default(true),
});

export const serviceGroupUpdateSchema = z
  .object({
    code: z.string().trim().min(1).max(50).optional(),
    name: z.string().trim().min(2).max(160).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos uma alteração.",
  });

export const serviceSchema = z.object({
  groupId: uuid,
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(160),
  active: z.boolean().default(true),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  internal: z.boolean().default(false),
  requestKey: z.string().trim().min(8).max(200),
});

export const initialContactStartSchema = z.object({
  message: z.string().trim().min(3).max(3_000),
  requestKey: z.string().trim().min(8).max(200),
});

export const resolveTicketSchema = z.object({
  resolutionSummary: z.string().trim().min(3).max(4000),
  version: z.number().int().positive(),
  requestKey: z.string().trim().min(8).max(200),
});

export const costCenterSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(160),
  active: z.boolean().default(true),
});

export const costCenterUpdateSchema = z
  .object({
    code: z.string().trim().min(1).max(50).optional(),
    name: z.string().trim().min(2).max(160).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos uma alteração.",
  });

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const manualProjectSchema = z.object({
  code: z.string().trim().regex(/^PRO-\d+$/i, "Use o formato PRO-0001."),
  name: z.string().trim().min(2).max(160),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  availableToAll: z.boolean().default(true),
  billableByDefault: z.boolean().default(false),
  active: z.boolean().default(true),
  hourlyRate: z.number().min(0).max(1_000_000).optional(),
  hourlyRateEffectiveFrom: isoDateSchema.optional(),
}).superRefine((value, context) => {
  if ((value.hourlyRate === undefined) !== (value.hourlyRateEffectiveFrom === undefined)) {
    context.addIssue({ code: "custom", message: "Informe o valor-hora e sua data de vigência juntos.", path: ["hourlyRate"] });
  }
});

export const manualProjectUpdateSchema = z
  .object({
    code: z.string().trim().regex(/^PRO-\d+$/i, "Use o formato PRO-0001.").optional(),
    name: z.string().trim().min(2).max(160).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    availableToAll: z.boolean().optional(),
    billableByDefault: z.boolean().optional(),
    active: z.boolean().optional(),
    hourlyRate: z.number().min(0).max(1_000_000).optional(),
    hourlyRateEffectiveFrom: isoDateSchema.optional(),
  })
  .superRefine((value, context) => {
    if ((value.hourlyRate === undefined) !== (value.hourlyRateEffectiveFrom === undefined)) {
      context.addIssue({ code: "custom", message: "Informe o valor-hora e sua data de vigência juntos.", path: ["hourlyRate"] });
    }
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos uma alteração.",
  });

export const userGroupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  managerId: z.string().uuid().nullable().optional(),
  memberIds: z.array(z.string().uuid()).max(200).default([]),
  active: z.boolean().default(true),
});

export const timeGoalSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    targetSeconds: z.number().int().positive().max(31_536_000),
    startsOn: isoDateSchema,
    endsOn: isoDateSchema.nullable(),
    permanent: z.boolean().default(false),
    targetUserId: z.string().uuid().nullable().optional(),
    targetGroupId: z.string().uuid().nullable().optional(),
    manualProjectId: z.string().uuid().nullable().optional(),
    costCenterId: z.string().uuid().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (Boolean(value.targetUserId) === Boolean(value.targetGroupId)) {
      context.addIssue({ code: "custom", message: "Selecione exatamente um usuário ou grupo.", path: ["targetUserId"] });
    }
    if (value.permanent && value.endsOn !== null) {
      context.addIssue({
        code: "custom",
        message: "Metas permanentes não possuem data final.",
        path: ["endsOn"],
      });
    }
    if (!value.permanent && value.endsOn === null) {
      context.addIssue({
        code: "custom",
        message: "Informe a data final ou marque a meta como permanente.",
        path: ["endsOn"],
      });
    }
    if (value.endsOn !== null && value.endsOn < value.startsOn) {
      context.addIssue({ code: "custom", message: "A data final não pode ser anterior à inicial.", path: ["endsOn"] });
    }
  });

export const timeGoalStatusSchema = z.object({
  active: z.boolean(),
});

export const timerStartSchema = z.object({
  description: z.string().trim().min(1).max(500),
  projectId: z.string().regex(/^(cost-center|manual):[0-9a-f-]{36}$/i),
  billable: z.boolean(),
  requestKey: z.string().trim().min(8).max(200),
});

export const timerStopSchema = z.object({
  timerId: z.string().uuid().optional(),
  requestKey: z.string().trim().min(8).max(200).optional(),
});

export const timerUpdateSchema = z
  .object({
    description: z.string().trim().min(1).max(500).optional(),
    projectId: z
      .string()
      .regex(/^(cost-center|manual):[0-9a-f-]{36}$/i)
      .optional(),
    billable: z.boolean().optional(),
    version: z.number().int().positive(),
  })
  .refine(
    (value) =>
      value.description !== undefined ||
      value.projectId !== undefined ||
      value.billable !== undefined,
    {
      message: "Informe o que deve ser alterado no timer.",
    },
  );

export const manualTimeEntrySchema = z
  .object({
    description: z.string().trim().min(1).max(500),
    projectId: z.string().regex(/^(cost-center|manual):[0-9a-f-]{36}$/i),
    billable: z.boolean(),
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date(),
    requestKey: z.string().trim().min(8).max(200),
  })
  .refine((value) => value.endedAt > value.startedAt, {
    path: ["endedAt"],
    message: "A hora final deve ser posterior à inicial.",
  });

export const evaluationSchema = z.object({
  externalReference: nonEmpty,
  externalId: nonEmpty,
  score: z.number().int().min(1).max(10),
  justification: z.string().trim().max(4000).optional(),
  expectationMet: z.boolean().optional(),
  comments: z.string().trim().max(4000).optional(),
});

export const assetSchema = z.object({
  assetTag: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(100),
  serialNumber: z.string().trim().max(160).optional().or(z.literal("")),
  status: z.nativeEnum(AssetStatus),
  assignedToName: z.string().trim().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const assetUpdateSchema = assetSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos uma alteração.",
  });

const emptyToNull = z.literal("").transform(() => null);

export const optionalNullableDate = z
  .union([emptyToNull, z.null(), z.coerce.date()])
  .optional();

export const optionalNullableUuid = z
  .union([emptyToNull, z.null(), uuid])
  .optional();

export const adminUserSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(200),
  externalId: z.string().trim().min(1).max(120),
  role: z.nativeEnum(UserRole),
  active: z.boolean().default(true),
});

export const adminUserUpdateSchema = adminUserSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos uma alteração.",
  });

export const adminTicketUpdateSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().min(1).max(20_000).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assigneeId: optionalNullableUuid,
  requesterName: z.string().trim().min(1).max(200).optional(),
  requesterId: optionalNullableUuid,
  requesterExternalId: z
    .union([emptyToNull, z.null(), z.string().trim().max(120)])
    .optional(),
  costCenterId: optionalNullableUuid,
  catalogServiceId: optionalNullableUuid,
  requestType: z
    .union([emptyToNull, z.null(), z.string().trim().max(80)])
    .optional(),
  service: z
    .union([emptyToNull, z.null(), z.string().trim().max(200)])
    .optional(),
  serviceGroup: z
    .union([emptyToNull, z.null(), z.string().trim().max(200)])
    .optional(),
  applicationOrProcess: z
    .union([emptyToNull, z.null(), z.string().trim().max(200)])
    .optional(),
  assetCode: z
    .union([emptyToNull, z.null(), z.string().trim().max(80)])
    .optional(),
  resolutionSummary: z
    .union([emptyToNull, z.null(), z.string().trim().max(4000)])
    .optional(),
  firstContactDeadline: optionalNullableDate,
  serviceDeadline: optionalNullableDate,
  openedAt: z.coerce.date().optional(),
  resolvedAt: optionalNullableDate,
  closedAt: optionalNullableDate,
  externalReference: z.string().trim().min(1).max(500).optional(),
  externalInstanceId: z
    .union([emptyToNull, z.null(), z.string().trim().max(80)])
    .optional(),
  externalInstanceUrl: z
    .union([emptyToNull, z.null(), z.string().trim().max(500)])
    .optional(),
  zeevTaskCode: z
    .union([emptyToNull, z.null(), z.string().trim().max(40)])
    .optional(),
  zeevAssignmentId: z
    .union([emptyToNull, z.null(), z.string().trim().max(80)])
    .optional(),
  resolutionCycle: z.number().int().min(1).max(99).optional(),
  evaluation: z
    .union([
      z.null(),
      z.object({
        score: z.number().int().min(1).max(10),
        justification: z
          .union([emptyToNull, z.null(), z.string().trim().max(4000)])
          .optional(),
        expectationMet: z.boolean().nullable().optional(),
        comments: z
          .union([emptyToNull, z.null(), z.string().trim().max(4000)])
          .optional(),
      }),
    ])
    .optional(),
  workPeriods: z
    .array(
      z.object({
        id: uuid,
        startedAt: z.coerce.date(),
        endedAt: optionalNullableDate,
        pausedAt: optionalNullableDate,
        valid: z.boolean(),
        cycle: z.number().int().min(1).max(99).optional(),
      }),
    )
    .optional(),
  reason: z.string().trim().min(3).max(500),
  version: z.number().int().positive(),
});

export const adminTimeEntryUpdateSchema = z
  .object({
    userId: uuid.optional(),
    description: z.string().trim().min(1).max(500).optional(),
    projectId: z
      .string()
      .regex(/^(cost-center|manual):[0-9a-f-]{36}$/i)
      .optional(),
    ticketId: optionalNullableUuid,
    billable: z.boolean().optional(),
    startedAt: z.coerce.date().optional(),
    endedAt: z.coerce.date().optional(),
    status: z.nativeEnum(TimeEntryStatus).optional(),
    source: z.nativeEnum(TimeEntrySource).optional(),
    correctionReason: z.string().trim().min(3).max(1000),
    version: z.number().int().positive(),
  })
  .refine(
    (value) =>
      !value.startedAt || !value.endedAt || value.endedAt > value.startedAt,
    {
      path: ["endedAt"],
      message: "A hora final deve ser posterior à inicial.",
    },
  );

export const adminTicketCreateSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(20_000),
  requesterName: z.string().trim().min(1).max(200),
  status: z.nativeEnum(TicketStatus).default(TicketStatus.NEW),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.MEDIUM),
  assigneeId: optionalNullableUuid,
  costCenterId: optionalNullableUuid,
  catalogServiceId: optionalNullableUuid,
  requestType: z.string().trim().max(80).optional(),
  openedAt: z.coerce.date().optional(),
  externalReference: z.string().trim().min(1).max(500).optional(),
});

export const adminTimeEntryCreateSchema = z
  .object({
    userId: uuid,
    description: z.string().trim().min(1).max(500),
    projectId: z.string().regex(/^(cost-center|manual):[0-9a-f-]{36}$/i),
    ticketId: optionalNullableUuid,
    billable: z.boolean().default(false),
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date(),
    status: z.nativeEnum(TimeEntryStatus).default(TimeEntryStatus.VALID),
    source: z.nativeEnum(TimeEntrySource).default(TimeEntrySource.MANUAL),
  })
  .refine((value) => value.endedAt > value.startedAt, {
    path: ["endedAt"],
    message: "A hora final deve ser posterior à inicial.",
  });

export function normalizePriority(value: string | undefined): TicketPriority {
  const normalized = value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized?.includes("critic") || normalized?.includes("urgent"))
    return TicketPriority.CRITICAL;
  if (normalized?.includes("alta") || normalized?.includes("high"))
    return TicketPriority.HIGH;
  if (normalized?.includes("baixa") || normalized?.includes("low"))
    return TicketPriority.LOW;
  return TicketPriority.MEDIUM;
}
