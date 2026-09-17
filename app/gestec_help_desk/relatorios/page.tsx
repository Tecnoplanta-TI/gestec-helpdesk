import { Download01Icon } from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { listProjectCatalog } from "@/lib/domain/projects";
import { allocateSeconds } from "@/lib/domain/project-rateio";
import { reportTimeEntryWhere } from "@/lib/domain/report-query";
import {
  displayPersonName,
  formatCatalogLabel,
  formatDuration,
  formatRateioSummary,
  ticketStatusLabels,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("reports:view");
  const params = await searchParams;
  const scalar = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : "";
  const [{ databaseNow }] = await prisma.$queryRaw<
    Array<{ databaseNow: Date }>
  >`SELECT NOW() AS "databaseNow"`;
  const defaultFrom = new Date(databaseNow.getTime() - 30 * 86_400_000);
  const fromValue =
    typeof params.from === "string"
      ? params.from
      : format(defaultFrom, "yyyy-MM-dd");
  const toValue =
    typeof params.to === "string"
      ? params.to
      : format(databaseNow, "yyyy-MM-dd");
  const projectValue = scalar(params.manualProject);
  const costCenterValue = scalar(params.costCenter);
  const billableValue = scalar(params.billable);
  const ticketValue = scalar(params.ticket);
  const requestedUser = scalar(params.userId);
  const userValue = requestedUser || session.userId;
  const reportParams = new URLSearchParams({ from: fromValue, to: toValue });
  if (projectValue && projectValue !== "all")
    reportParams.set("manualProject", projectValue);
  if (costCenterValue && costCenterValue !== "all")
    reportParams.set("costCenter", costCenterValue);
  if (billableValue && billableValue !== "all")
    reportParams.set("billable", billableValue);
  if (ticketValue) reportParams.set("ticket", ticketValue);
  if (userValue && userValue !== "all") reportParams.set("userId", userValue);
  const {
    from,
    to,
    where: timeWhere,
  } = await reportTimeEntryWhere(reportParams, databaseNow);
  const [
    ticketsByStatus,
    hoursByBillable,
    hoursByProject,
    evaluations,
    projects,
    costCenters,
    users,
  ] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["status"],
      _count: true,
      where: { openedAt: { gte: from, lte: to } },
    }),
    prisma.timeEntry.groupBy({
      by: ["billable"],
      where: timeWhere,
      _sum: { durationSeconds: true },
    }),
    prisma.timeEntry.groupBy({
      by: ["projectNameSnapshot", "costCenterId", "manualProjectId"],
      where: timeWhere,
      _sum: { durationSeconds: true },
    }),
    prisma.ticketEvaluation.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _avg: { score: true },
      _count: true,
    }),
    listProjectCatalog({
      includePrivateManual: hasPermission(session.role, "time:manage"),
      includeInactive: true,
    }),
    prisma.costCenter.findMany({
      select: { id: true, code: true, name: true, active: true },
      orderBy: [{ code: "asc" }, { name: "asc" }],
    }),
    prisma.userRef.findMany({
      where: {
        OR: [
          { active: true },
          { id: session.userId },
          ...(userValue && userValue !== "all" ? [{ id: userValue }] : []),
        ],
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const projectIds = [
    ...new Set(
      hoursByProject
        .map((row) => row.manualProjectId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const rateioShares = projectIds.length
    ? await prisma.projectCostCenterShare.findMany({
        where: { manualProjectId: { in: projectIds } },
        select: {
          manualProjectId: true,
          costCenterId: true,
          shareBps: true,
          costCenter: { select: { code: true, name: true } },
        },
        orderBy: { shareBps: "desc" },
      })
    : [];
  const sharesByProject = new Map<
    string,
    Array<{
      costCenterId: string;
      shareBps: number;
      code: string;
      name: string;
    }>
  >();
  for (const share of rateioShares) {
    const current = sharesByProject.get(share.manualProjectId) ?? [];
    current.push({
      costCenterId: share.costCenterId,
      shareBps: share.shareBps,
      code: share.costCenter.code,
      name: share.costCenter.name,
    });
    sharesByProject.set(share.manualProjectId, current);
  }
  const costCenterById = new Map(
    costCenters.map((costCenter) => [costCenter.id, costCenter]),
  );
  const projectById = new Map(
    projects.map((project) => [project.id.replace(/^manual:/, ""), project]),
  );
  const userLabel = (user: { id: string; name: string; email: string }) =>
    displayPersonName(user.name, user.email);
  const activeCostCenters = costCenters.filter(
    (costCenter) => costCenter.active || costCenter.id === costCenterValue,
  );
  const costCenterLabels: Record<string, string> = {
    all: "Todos",
    ...Object.fromEntries(
      activeCostCenters.map((costCenter) => [
        costCenter.id,
        formatCatalogLabel(costCenter.code, costCenter.name),
      ]),
    ),
  };
  const projectLabels: Record<string, string> = {
    all: "Todos",
    ...Object.fromEntries(
      projects.map((project) => [
        project.id.replace(/^manual:/, ""),
        formatCatalogLabel(project.code, project.name),
      ]),
    ),
  };
  const billableLabels: Record<string, string> = {
    all: "Todas",
    billable: "Faturável",
    "non-billable": "Não faturável",
  };
  const userLabels: Record<string, string> = {
    all: "Todos os usuários",
    ...Object.fromEntries(users.map((user) => [user.id, userLabel(user)])),
  };
  const totalSeconds = hoursByBillable.reduce(
    (sum, row) => sum + (row._sum.durationSeconds ?? 0),
    0,
  );
  const billableSeconds =
    hoursByBillable.find((row) => row.billable)?._sum.durationSeconds ?? 0;
  const projectTotals = hoursByProject
    .map((row) => {
      const seconds = row._sum.durationSeconds ?? 0;
      if (row.costCenterId) {
        const costCenter = costCenterById.get(row.costCenterId);
        return {
          key: `cc:${row.costCenterId}`,
          name: costCenter
            ? formatCatalogLabel(costCenter.code, costCenter.name)
            : (row.projectNameSnapshot ?? "Centro de custo"),
          type: "Centro de custo",
          rateio: "—",
          seconds,
        };
      }
      if (row.manualProjectId) {
        const project = projectById.get(row.manualProjectId);
        const shares = sharesByProject.get(row.manualProjectId) ?? [];
        return {
          key: `project:${row.manualProjectId}`,
          name: project
            ? formatCatalogLabel(project.code, project.name)
            : (row.projectNameSnapshot ?? "Projeto Semear"),
          type: "Projeto Semear",
          rateio: shares.length ? formatRateioSummary(shares) : "Sem rateio",
          seconds,
        };
      }
      return {
        key: `unclassified:${row.projectNameSnapshot ?? ""}`,
        name: row.projectNameSnapshot ?? "Pendente de classificação",
        type: "Sem classificação",
        rateio: "—",
        seconds,
      };
    })
    .sort((left, right) => right.seconds - left.seconds);

  const allocatedTotals = new Map<string, { name: string; seconds: number }>();
  function addAllocated(key: string, name: string, seconds: number) {
    const current = allocatedTotals.get(key);
    if (current) {
      current.seconds += seconds;
      return;
    }
    allocatedTotals.set(key, { name, seconds });
  }
  for (const row of hoursByProject) {
    const seconds = row._sum.durationSeconds ?? 0;
    if (row.costCenterId) {
      const costCenter = costCenterById.get(row.costCenterId);
      addAllocated(
        `cc:${row.costCenterId}`,
        costCenter
          ? formatCatalogLabel(costCenter.code, costCenter.name)
          : (row.projectNameSnapshot ?? "Centro de custo"),
        seconds,
      );
      continue;
    }
    if (row.manualProjectId) {
      const shares = sharesByProject.get(row.manualProjectId) ?? [];
      if (!shares.length) {
        addAllocated("sem-rateio", "Projetos sem rateio", seconds);
        continue;
      }
      for (const share of allocateSeconds(seconds, shares)) {
        addAllocated(
          `cc:${share.costCenterId}`,
          formatCatalogLabel(share.code, share.name),
          share.seconds,
        );
      }
      continue;
    }
    addAllocated(
      "unclassified",
      row.projectNameSnapshot ?? "Pendente de classificação",
      seconds,
    );
  }
  const allocatedRows = [...allocatedTotals.entries()]
    .map(([key, row]) => ({ key, ...row }))
    .sort((left, right) => right.seconds - left.seconds);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Indicadores calculados a partir dos dados operacionais e do período
            selecionado.
          </p>
        </div>
        <Button
          render={
            <a
              href={`/api/v1/gestec-help-desk/reports/time-entries.xlsx?${reportParams.toString()}`}
              download
            />
          }
        >
          <HugeiconsIcon data-icon="inline-start" icon={Download01Icon} />{" "}
          Exportar apontamentos (.xlsx)
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              De
              <Input type="date" name="from" defaultValue={fromValue} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Até
              <Input type="date" name="to" defaultValue={toValue} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Centro de custo
              <Select
                name="costCenter"
                defaultValue={costCenterValue || "all"}
                items={costCenterLabels}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {costCenterLabels[costCenterValue || "all"] ?? "Todos"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {activeCostCenters.map((costCenter) => (
                    <SelectItem key={costCenter.id} value={costCenter.id}>
                      {formatCatalogLabel(costCenter.code, costCenter.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Projeto Semear
              <Select
                name="manualProject"
                defaultValue={projectValue || "all"}
                items={projectLabels}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {projectLabels[projectValue || "all"] ?? "Todos"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {projects.map((project) => (
                    <SelectItem
                      key={project.id}
                      value={project.id.replace(/^manual:/, "")}
                    >
                      {formatCatalogLabel(project.code, project.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Faturabilidade
              <Select
                name="billable"
                defaultValue={billableValue || "all"}
                items={billableLabels}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {billableLabels[billableValue || "all"] ?? "Todas"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="billable">Faturável</SelectItem>
                  <SelectItem value="non-billable">Não faturável</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Usuário
              <Select
                name="userId"
                defaultValue={userValue || "all"}
                items={userLabels}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {userLabels[userValue || "all"] ?? "Todos os usuários"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {userLabel(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Ticket ou descrição
              <Input
                name="ticket"
                defaultValue={ticketValue}
                placeholder="#1842 ou termo"
              />
            </label>
            <Button type="submit" className="self-end">
              Aplicar filtros
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            A tela abre nos seus apontamentos. Centro de custo inclui horas
            diretas e o rateio dos projetos Semear. A exportação usa os mesmos
            filtros e nomes.
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Tickets no período</CardDescription>
            <CardTitle className="text-3xl">
              {ticketsByStatus.reduce((sum, item) => sum + item._count, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Horas registradas</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatDuration(totalSeconds)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Horas faturáveis</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatDuration(billableSeconds)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Média das avaliações</CardDescription>
            <CardTitle className="text-3xl">
              {evaluations._count
                ? `${evaluations._avg.score?.toFixed(1)}/10`
                : "Sem dados"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tickets por status</CardTitle>
            <CardDescription>
              Distribuição de aberturas no período.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketsByStatus.map((item) => (
                  <TableRow key={item.status}>
                    <TableCell>{ticketStatusLabels[item.status]}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item._count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Horas por centro de custo e projeto</CardTitle>
            <CardDescription>
              Projetos Semear mostram o rateio cadastrado; a duração é a hora
              original apontada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Rateio</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectTotals.length ? (
                  projectTotals.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.type}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.rateio}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatDuration(item.seconds)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Sem apontamentos no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Horas rateadas por centro de custo</CardTitle>
          <CardDescription>
            Horas lançadas direto no centro de custo somadas à fração dos
            projetos Semear com rateio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Centro de custo</TableHead>
                <TableHead className="text-right">Duração</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocatedRows.length ? (
                allocatedRows.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatDuration(item.seconds)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Sem apontamentos no período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
