import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [
    users,
    costCenters,
    serviceGroups,
    services,
    projects,
    userGroups,
    goals,
    notifications,
    tickets,
    comments,
    attachments,
    workPeriods,
    timeEntries,
    activeTimers,
    assets,
    evaluations,
    syncExecutions,
    auditEvents,
  ] = await Promise.all([
    prisma.userRef.count(),
    prisma.costCenter.count(),
    prisma.serviceGroup.count(),
    prisma.service.count(),
    prisma.manualProject.count(),
    prisma.userGroup.count(),
    prisma.timeGoal.count(),
    prisma.notification.count(),
    prisma.ticket.count(),
    prisma.ticketComment.count(),
    prisma.ticketAttachment.count(),
    prisma.ticketWorkPeriod.count(),
    prisma.timeEntry.count(),
    prisma.activeTimer.count(),
    prisma.asset.count(),
    prisma.ticketEvaluation.count(),
    prisma.syncExecution.count(),
    prisma.auditEvent.count(),
  ]);

  console.table({
    users,
    costCenters,
    serviceGroups,
    services,
    projects,
    userGroups,
    goals,
    notifications,
    tickets,
    comments,
    attachments,
    workPeriods,
    timeEntries,
    activeTimers,
    assets,
    evaluations,
    syncExecutions,
    auditEvents,
  });
}

main()
  .catch((error) => {
    console.error(
      "Não foi possível inspecionar o banco de dados local.",
      error,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
