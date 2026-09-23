import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatHoursMinutes } from "@/lib/format";
import { goalProgressPercent } from "@/lib/domain/time-goals";

type Member = {
  userId: string;
  name: string;
  seconds: number;
  goalSeconds: number;
};

export function TimeDashboard({
  todaySeconds,
  weekSeconds,
  monthSeconds,
  billableSeconds,
  goalThroughTodaySeconds,
  team,
}: {
  todaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  billableSeconds: number;
  goalThroughTodaySeconds: number;
  team: Member[];
}) {
  const monthPercent = goalProgressPercent(
    monthSeconds,
    goalThroughTodaySeconds,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe totais, o ritmo da meta mensal e a atividade da equipe.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Hoje" value={formatHoursMinutes(todaySeconds)} />
        <SummaryCard label="Semana" value={formatHoursMinutes(weekSeconds)} />
        <SummaryCard label="Mês" value={formatHoursMinutes(monthSeconds)} />
        <SummaryCard
          label="Faturável no mês"
          value={formatHoursMinutes(billableSeconds)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ritmo da meta mensal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold tabular-nums">
              {monthPercent}%
            </p>
            <p className="text-sm text-muted-foreground">
              {formatHoursMinutes(monthSeconds)} de{" "}
              {formatHoursMinutes(goalThroughTodaySeconds)} até hoje
            </p>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={monthPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso da meta mensal até hoje"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${monthPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acompanhamento da meta mensal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {team.length === 0 ? (
            <Empty className="border p-8">
              <EmptyHeader>
                <EmptyTitle>Nenhuma hora no mês</EmptyTitle>
                <EmptyDescription>
                  Os apontamentos da equipe aparecem aqui conforme forem
                  registrados.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            team.map((member) => {
              const percent = goalProgressPercent(
                member.seconds,
                member.goalSeconds,
              );
              return (
                <div key={member.userId} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="truncate font-medium">{member.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatHoursMinutes(member.seconds)} · {percent}%
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progresso de ${member.name}`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gráficos</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty className="border p-8">
            <EmptyHeader>
              <EmptyTitle>Em backlog</EmptyTitle>
              <EmptyDescription>
                Os gráficos de distribuição e tendência entram numa entrega
                posterior.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardHeader>
    </Card>
  );
}
