"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { apiRequest } from "@/lib/http/client";

export type AdminTimer = {
  id: string;
  description: string;
  projectName: string;
  billable: boolean;
  startedAt: string;
  user: { name: string; email: string };
};

export function AdminTimerManager({ timers }: { timers: AdminTimer[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function discard(timer: AdminTimer) {
    startTransition(async () => {
      try {
        await apiRequest(`/api/v1/gestec-help-desk/admin/timers/${timer.id}`, {
          method: "DELETE",
        });
        toast.success("Timer descartado.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível descartar o timer.",
        );
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pessoa</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Centro de custo / projeto</TableHead>
            <TableHead>Início</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-28 text-center text-muted-foreground"
              >
                Nenhum timer ativo.
              </TableCell>
            </TableRow>
          ) : (
            timers.map((timer) => (
              <TableRow key={timer.id}>
                <TableCell>
                  <p className="font-medium">{timer.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {timer.user.email}
                  </p>
                </TableCell>
                <TableCell>{timer.description}</TableCell>
                <TableCell>
                  {timer.projectName}
                  {timer.billable ? " · faturável" : ""}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDateTime(timer.startedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() => discard(timer)}
                  >
                    Descartar
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
