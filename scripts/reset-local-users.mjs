import { PrismaClient } from "@prisma/client";

const confirmation = "--confirm=ZERAR_USUARIOS_LOCAIS";
if (!process.argv.includes(confirmation)) {
  console.error(`Operação bloqueada. Execute com ${confirmation}.`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

const host = new URL(databaseUrl).hostname;
if (!new Set(["localhost", "127.0.0.1", "::1"]).has(host)) {
  console.error("Operação bloqueada: este comando só pode limpar um banco local.");
  process.exit(1);
}

const prisma = new PrismaClient();
const models = [
  "userRef", "ticket", "ticketComment", "ticketAttachment", "timeEntry",
  "ticketWorkPeriod", "notification", "syncExecution", "auditEvent",
];

try {
  const before = Object.fromEntries(
    await Promise.all(models.map(async (model) => [model, await prisma[model].count()])),
  );

  await prisma.$transaction(async (tx) => {
    await tx.activeTimer.deleteMany();
    await tx.ticketAttachment.deleteMany();
    await tx.ticketComment.deleteMany();
    await tx.ticketParticipant.deleteMany();
    await tx.ticketHistory.deleteMany();
    await tx.ticketWorkPeriod.deleteMany();
    await tx.timeEntry.deleteMany();
    await tx.ticketAsset.deleteMany();
    await tx.ticketEvaluation.deleteMany();
    await tx.syncExecution.deleteMany();
    await tx.notification.deleteMany();
    await tx.auditEvent.deleteMany();
    await tx.ticket.deleteMany();
    await tx.timeGoal.deleteMany();
    await tx.userGroupMember.deleteMany();
    await tx.userGroup.deleteMany();
    await tx.projectHourlyRate.deleteMany();
    await tx.userRef.deleteMany();
  });

  console.log("Dados operacionais e usuários locais removidos com sucesso.");
  console.table(before);
  console.log("Cadastros preservados: centros de custo, grupos/serviços, projetos e ativos.");
} finally {
  await prisma.$disconnect();
}
