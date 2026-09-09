import Link from "next/link";

import { AdminAuditLog } from "@/components/admin/audit-log";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("admin:manage");
  const params = await searchParams;
  const requestedPage = Number(
    typeof params.page === "string" ? params.page : 1,
  );
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditEvent.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Registro das correções administrativas e das ações operacionais.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
          <CardDescription>
            {total} evento(s) · página {page} de {pages}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AdminAuditLog events={JSON.parse(JSON.stringify(events))} />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              render={
                <Link
                  href={`/gestec_help_desk/admin/auditoria?page=${page - 1}`}
                  prefetch={false}
                />
              }
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              render={
                <Link
                  href={`/gestec_help_desk/admin/auditoria?page=${page + 1}`}
                  prefetch={false}
                />
              }
            >
              Próxima
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
