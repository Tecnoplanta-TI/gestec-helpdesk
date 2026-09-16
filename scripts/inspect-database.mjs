import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Run sequentially: Supabase's session pool has a small connection cap and
  // a large Promise.all here can exhaust it before the inspection completes.
  const users = await prisma.userRef.count();
  const costCenters = await prisma.costCenter.count();
  const serviceGroups = await prisma.serviceGroup.count();
  const services = await prisma.service.count();
  const projects = await prisma.manualProject.count();
  const userGroups = await prisma.userGroup.count();
  const goals = await prisma.timeGoal.count();
  const notifications = await prisma.notification.count();
  const tickets = await prisma.ticket.count();
  const comments = await prisma.ticketComment.count();
  const attachments = await prisma.ticketAttachment.count();
  const workPeriods = await prisma.ticketWorkPeriod.count();
  const timeEntries = await prisma.timeEntry.count();
  const activeTimers = await prisma.activeTimer.count();
  const assets = await prisma.asset.count();
  const evaluations = await prisma.ticketEvaluation.count();
  const syncExecutions = await prisma.syncExecution.count();
  const auditEvents = await prisma.auditEvent.count();

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
