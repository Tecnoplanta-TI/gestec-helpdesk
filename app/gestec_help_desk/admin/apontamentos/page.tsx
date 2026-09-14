import { addDays, format } from "date-fns";

import { AdminTimeEntryManager } from "@/components/admin/time-entry-manager";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePagePermission } from "@/lib/auth/page-session";
import { listProjectCatalog } from "@/lib/domain/projects";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTimeEntriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePagePermission("admin:manage");
  const params = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");
  const fromValue =
    typeof params.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.from)
      ? params.from
      : format(addDays(new Date(), -14), "yyyy-MM-dd");
  const toValue =
    typeof params.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.to)
      ? params.to
      : today;
  const from = new Date(`${fromValue}T00:00:00`);
  const to = addDays(new Date(`${toValue}T00:00:00`), 1);

  const [entries, users, projects] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { startedAt: { gte: from, lt: to } },
      include: {
        user: { select: { name: true } },
        ticket: { select: { number: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 200,
    }),
    prisma.userRef.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    listProjectCatalog({
      includePrivateManual: true,
      includeInactive: true,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Apontamentos</h1>
        <p className="text-sm text-muted-foreground">
          Correção manual de horas de qualquer pessoa, inclusive invalidar ou
          reativar.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Período</CardTitle>
          <CardDescription>
            Até 200 lançamentos no intervalo selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <label className="flex flex-col gap-1 text-sm">
              De
              <Input type="date" name="from" defaultValue={fromValue} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Até
              <Input type="date" name="to" defaultValue={toValue} />
            </label>
            <Button type="submit">Filtrar</Button>
          </form>
          <AdminTimeEntryManager
            entries={JSON.parse(JSON.stringify(entries))}
            users={users}
            currentUserId={session.userId}
            projects={projects.map((project) => ({
              id: project.id,
              name: project.name,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
