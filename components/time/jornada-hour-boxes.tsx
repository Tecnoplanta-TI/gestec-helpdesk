import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatGoalOffset, formatHoursMinutes } from "@/lib/format";

export function JornadaHourBoxes({
  todaySeconds,
  dailyGoalSeconds,
}: {
  todaySeconds: number;
  dailyGoalSeconds: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardDescription>Hoje</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {formatHoursMinutes(todaySeconds)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Meta</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {formatGoalOffset(todaySeconds, dailyGoalSeconds)}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
