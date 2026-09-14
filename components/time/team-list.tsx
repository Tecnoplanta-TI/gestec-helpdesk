import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatHoursMinutes } from "@/lib/format";
import { goalProgressPercent } from "@/lib/domain/time-goals";

export type TeamListItem = {
  userId: string;
  name: string;
  email: string;
  seconds: number;
  goalSeconds: number;
};

export function TeamList({ members }: { members: TeamListItem[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-muted-foreground">
          Horas do mês e percentual da meta. Gráficos comparativos ficam em
          backlog.
        </p>
      </div>
      {members.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Nenhum apontamento no mês</EmptyTitle>
            <EmptyDescription>
              A lista é preenchida com quem registrou horas no período atual.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Horas no mês</TableHead>
                <TableHead>Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatHoursMinutes(member.seconds)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {goalProgressPercent(member.seconds, member.goalSeconds)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
