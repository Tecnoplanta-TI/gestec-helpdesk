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
import { reportFilters } from "@/lib/domain/report-query";
import { formatDuration, ticketStatusLabels } from "@/lib/format";
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
  const projectValue = scalar(params.project);
  const billableValue = scalar(params.billable);
  const ticketValue = scalar(params.ticket);
  const userValue = scalar(params.userId);
  const reportParams = new URLSearchParams({ from: fromValue, to: toValue });
  if (projectValue && projectValue !== "all")
    reportParams.set("project", projectValue);
  if (billableValue && billableValue !== "all")
    reportParams.set("billable", billableValue);
  if (ticketValue) reportParams.set("ticket", ticketValue);
  if (userValue && userValue !== "all") reportParams.set("userId", userValue);
  const {
    from,
    to,
    where: timeWhere,
  } = reportFilters(reportParams, databaseNow);
  const [
    ticketsByStatus,
    hoursByBillable,
    hoursByProject,
    evaluations,
    projects,
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
      by: ["projectNameSnapshot"],
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
    }),
    prisma.userRef.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const totalSeconds = hoursByBillable.reduce(
    (sum, row) => sum + (row._sum.durationSeconds ?? 0),
    0,
  );
  const billableSeconds =
    hoursByBillable.find((row) => row.billable)?._sum.durationSeconds ?? 0;
  const projectTotals = Object.entries(
    hoursByProject.reduce<Record<string, number>>((accumulator, row) => {
      const key = row.projectNameSnapshot ?? "Pendente de classificação";
      accumulator[key] =
        (accumulator[key] ?? 0) + (row._sum.durationSeconds ?? 0);
      return accumulator;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);

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
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              De
              <Input type="date" name="from" defaultValue={fromValue} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Até
              <Input type="date" name="to" defaultValue={toValue} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Projeto
              <Select
                name="project"
                defaultValue={projectValue || "all"}
                items={Object.fromEntries([
                  ["all", "Todos os projetos"],
                  ...projects.map((project) => [project.id, project.name]),
                ])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                      {project.code ? ` · ${project.code}` : ""}
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
                items={{
                  all: "Todas",
                  billable: "Faturável",
                  "non-billable": "Não faturável",
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
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
                items={Object.fromEntries([
                  ["all", "Todos os usuários"],
                  ...users.map((user) => [user.id, user.name]),
                ])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
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
            Projeto, faturabilidade, usuário e ticket ou descrição refinam os
            apontamentos, os totais de horas e a exportação. Indicadores de
            tickets consideram o período informado.
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
            <CardTitle>Horas por projeto</CardTitle>
            <CardDescription>
              Base quantitativa para gestão e cobrança; valores monetários não
              foram definidos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectTotals.length ? (
                  projectTotals.map(([project, seconds]) => (
                    <TableRow key={project}>
                      <TableCell>{project}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatDuration(seconds)}
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
    </div>
  );
}
