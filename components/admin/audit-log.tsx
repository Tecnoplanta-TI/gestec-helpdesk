import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export type AdminAuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { name: string } | null;
};

export function AdminAuditLog({ events }: { events: AdminAuditRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead>Autor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-28 text-center text-muted-foreground"
              >
                Nenhuma auditoria registrada.
              </TableCell>
            </TableRow>
          ) : (
            events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="tabular-nums">
                  {formatDateTime(event.createdAt)}
                </TableCell>
                <TableCell className="font-medium">{event.action}</TableCell>
                <TableCell>
                  {event.entityType}
                  <span className="block font-mono text-xs text-muted-foreground">
                    {event.entityId}
                  </span>
                </TableCell>
                <TableCell>{event.actor?.name ?? "Sistema"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
