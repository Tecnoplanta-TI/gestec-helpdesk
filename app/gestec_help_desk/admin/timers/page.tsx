import { AdminTimerManager } from "@/components/admin/timer-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/page-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTimersPage() {
  await requirePagePermission("admin:manage");
  const timers = await prisma.activeTimer.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { startedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timers</h1>
        <p className="text-sm text-muted-foreground">
          Descarte um timer preso. Isso não gera apontamento.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em execução</CardTitle>
          <CardDescription>
            {timers.length} timer(s) ativo(s) no momento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTimerManager timers={JSON.parse(JSON.stringify(timers))} />
        </CardContent>
      </Card>
    </div>
  );
}
