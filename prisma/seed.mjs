import {
  AssetStatus,
  ParticipantRole,
  PrismaClient,
  TicketPriority,
  TicketStatus,
  TimeEntrySource,
  UserRole,
} from "@prisma/client"

import { gestecCostCenters } from "./gestec-cost-centers.mjs"

const prisma = new PrismaClient()

function normalizeProjectName(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()
}

async function main() {
  const admin = await prisma.userRef.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      externalId: "local-admin",
      name: "Caio Silveira",
      email: "caio.silveira@tecnoplanta.com.br",
      role: UserRole.ADMIN,
    },
    update: { active: true, role: UserRole.ADMIN },
  })

  const technician = await prisma.userRef.upsert({
    where: { id: "00000000-0000-4000-8000-000000000002" },
    create: {
      id: "00000000-0000-4000-8000-000000000002",
      externalId: "local-technician",
      name: "Ana Souza",
      email: "ana.souza@tecnoplanta.com.br",
      role: UserRole.TECHNICIAN,
    },
    update: { active: true, role: UserRole.TECHNICIAN },
  })

  for (const costCenter of gestecCostCenters) {
    await prisma.costCenter.upsert({
      where: { code: costCenter.code },
      create: { code: costCenter.code, name: costCenter.name, normalizedName: normalizeProjectName(costCenter.name), active: true },
      update: { name: costCenter.name, normalizedName: normalizeProjectName(costCenter.name), active: true },
    })
  }
  const tiCostCenter = await prisma.costCenter.findUniqueOrThrow({ where: { code: "65" } })
  const demoCostCenters = await prisma.costCenter.findMany({
    where: { code: { in: ["FIN", "RH", "OPS"] } },
    select: { id: true },
  })
  if (demoCostCenters.length) {
    const demoIds = demoCostCenters.map((item) => item.id)
    await prisma.ticket.updateMany({
      where: { costCenterId: { in: demoIds } },
      data: { costCenterId: tiCostCenter.id },
    })
    await prisma.timeEntry.updateMany({
      where: { costCenterId: { in: demoIds } },
      data: { costCenterId: tiCostCenter.id },
    })
    await prisma.activeTimer.updateMany({
      where: { costCenterId: { in: demoIds } },
      data: { costCenterId: tiCostCenter.id },
    })
    await prisma.costCenter.deleteMany({ where: { id: { in: demoIds } } })
  }

  const acessos = await prisma.serviceGroup.upsert({
    where: { code: "ACESSOS" },
    create: { code: "ACESSOS", name: "Acessos e identidade" },
    update: { name: "Acessos e identidade", active: true },
  })
  const infraestrutura = await prisma.serviceGroup.upsert({
    where: { code: "INFRA" },
    create: { code: "INFRA", name: "Infraestrutura" },
    update: { name: "Infraestrutura", active: true },
  })
  const requiredServiceGroups = [
    ["ACESSOS_CONTAS", "Acessos / Contas"],
    ["AQUISICAO_ALOCACAO", "Aquisição / Alocação"],
    ["DASHBOARD", "Dashboard"],
    ["EMAIL", "Email"],
    ["GESTEC", "Gestec"],
    ["IMPRESSORAS", "Impressoras"],
    ["MANUTENCAO_UPGRADE", "Manutenção / Upgrade"],
    ["OUTRO", "Outro"],
    ["PROGRAMAS", "Programas"],
    ["REDE_INTERNET", "Rede / Internet"],
    ["SIGER", "SIGER"],
    ["ZEEV", "Zeev"],
  ]
  for (const [code, name] of requiredServiceGroups) {
    await prisma.serviceGroup.upsert({
      where: { code },
      create: { code, name },
      update: { name, active: true },
    })
  }
  const permissoes = await prisma.service.upsert({
    where: { groupId_code: { groupId: acessos.id, code: "PERMISSOES" } },
    create: { groupId: acessos.id, code: "PERMISSOES", name: "Acessos e permissões" },
    update: { name: "Acessos e permissões", active: true },
  })
  await prisma.service.upsert({
    where: { groupId_code: { groupId: infraestrutura.id, code: "REDE" } },
    create: { groupId: infraestrutura.id, code: "REDE", name: "Rede e conectividade" },
    update: { name: "Rede e conectividade", active: true },
  })

  const manualProject = await prisma.manualProject.upsert({
    where: { normalizedName: "evolucao da plataforma" },
    create: {
      name: "Evolução da plataforma",
      normalizedName: "evolucao da plataforma",
      color: "#10b981",
      availableToAll: true,
      billableByDefault: false,
    },
    update: { active: true },
  })

  const notebook = await prisma.asset.upsert({
    where: { assetTag: "NOTE-0042" },
    create: {
      assetTag: "NOTE-0042",
      name: "Notebook Dell Latitude 5440",
      category: "Notebook",
      serialNumber: "DL5440-GESTEC-0042",
      status: AssetStatus.IN_USE,
      assignedToName: "Equipe Financeira",
    },
    update: {},
  })

  const ticket = await prisma.ticket.upsert({
    where: { externalReference: "ZEEV-1842" },
    create: {
      externalReference: "ZEEV-1842",
      externalInstanceUrl: "https://tecnoplanta.zeev.it",
      title: "Correção de acesso ao sistema financeiro",
      description: "Usuário não consegue acessar o módulo de contas a pagar.",
      requestType: "incidente",
      service: "Acessos e permissões",
      catalogServiceId: permissoes.id,
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      requesterName: "Mariana Costa",
      requesterExternalId: "mariana.costa",
      assigneeId: admin.id,
      costCenterId: tiCostCenter.id,
      openedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      serviceDeadline: new Date(Date.now() + 5 * 60 * 60 * 1000),
    },
    update: {
      assigneeId: admin.id,
      costCenterId: tiCostCenter.id,
      requestType: "incidente",
      catalogServiceId: permissoes.id,
      serviceDeadline: new Date(Date.now() + 5 * 60 * 60 * 1000),
    },
  })

  await prisma.ticket.upsert({
    where: { externalReference: "ZEEV-1901" },
    create: {
      externalReference: "ZEEV-1901",
      title: "Liberar pasta compartilhada do RH",
      description: "Nova colaboradora precisa de acesso à pasta de admissão.",
      requestType: "solicitacao",
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.NEW,
      requesterName: "Paulo Mendes",
      requesterExternalId: "paulo.mendes",
      openedAt: new Date(Date.now() - 90 * 60 * 1000),
    },
    update: { requestType: "solicitacao" },
  })

  await prisma.ticket.upsert({
    where: { externalReference: "ZEEV-1910" },
    create: {
      externalReference: "ZEEV-1910",
      title: "Melhorar relatório de horas extras",
      description: "Incluir filtro por centro de custo no relatório existente.",
      requestType: "melhoria",
      priority: TicketPriority.LOW,
      status: TicketStatus.TRIAGE,
      requesterName: "Carla Dias",
      requesterExternalId: "carla.dias",
      assigneeId: technician.id,
      openedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
    },
    update: { requestType: "melhoria", assigneeId: technician.id },
  })

  const startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const endedAt = new Date(startedAt.getTime() + 45 * 60 * 1000)
  await prisma.timeEntry.upsert({
    where: { idempotencyKey: "seed:manual-entry:1" },
    create: {
      userId: admin.id,
      manualProjectId: manualProject.id,
      source: TimeEntrySource.MANUAL,
      description: "Desenvolvimento da nova tela de indicadores",
      startedAt,
      endedAt,
      durationSeconds: 2700,
      billable: false,
      projectNameSnapshot: manualProject.name,
      idempotencyKey: "seed:manual-entry:1",
    },
    update: {},
  })

  await prisma.ticketHistory.upsert({
    where: { id: "00000000-0000-4000-8000-000000000101" },
    create: {
      id: "00000000-0000-4000-8000-000000000101",
      ticketId: ticket.id,
      action: "RECEIVED_FROM_ZEEV",
      toStatus: ticket.status,
      details: { seed: true },
    },
    update: {},
  })

  const primary = await prisma.ticketParticipant.findFirst({
    where: { ticketId: ticket.id, userId: admin.id, role: ParticipantRole.PRIMARY, removedAt: null },
  })
  if (!primary) {
    await prisma.ticketParticipant.create({
      data: { ticketId: ticket.id, userId: admin.id, role: ParticipantRole.PRIMARY, addedById: admin.id },
    })
  }

  const extra = await prisma.ticketParticipant.findFirst({
    where: { ticketId: ticket.id, userId: technician.id, role: ParticipantRole.ADDITIONAL, removedAt: null },
  })
  if (!extra) {
    await prisma.ticketParticipant.create({
      data: { ticketId: ticket.id, userId: technician.id, role: ParticipantRole.ADDITIONAL, addedById: admin.id },
    })
  }

  await prisma.ticketAsset.upsert({
    where: { ticketId_assetId: { ticketId: ticket.id, assetId: notebook.id } },
    create: { ticketId: ticket.id, assetId: notebook.id, linkedById: admin.id },
    update: { removedAt: null },
  })

  await prisma.ticket.updateMany({
    where: { requestType: "Incidente" },
    data: { requestType: "incidente" },
  })
  await prisma.ticket.updateMany({
    where: { requestType: "Solicitação" },
    data: { requestType: "solicitacao" },
  })
  await prisma.ticket.updateMany({
    where: { requestType: "Melhoria" },
    data: { requestType: "melhoria" },
  })
  await prisma.ticket.updateMany({
    where: { requestType: "Interrupção de serviços" },
    data: { requestType: "interrupcao_servico" },
  })
}

main()
  .then(() => console.log("Dados locais de desenvolvimento criados."))
  .finally(() => prisma.$disconnect())
