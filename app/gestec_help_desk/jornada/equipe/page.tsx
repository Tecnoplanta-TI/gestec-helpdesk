import { addMonths, startOfMonth } from "date-fns";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import {
  DAILY_GOAL_SECONDS,
  monthlyGoalSeconds,
} from "@/lib/domain/time-goals";
import { effectiveDailyGoalSecondsByUser } from "@/lib/domain/effective-goals";
import { listTeamMonthHours } from "@/lib/domain/team-time";
import { TeamList } from "@/components/time/team-list";

export const dynamic = "force-dynamic";

export default async function JornadaEquipePage() {
  const session = await requirePermission("time:view");
  const now = new Date();
  const canSeeTeam =
    hasPermission(session.role, "time:manage") ||
    hasPermission(session.role, "reports:view");
  const members = await listTeamMonthHours({
    monthFrom: startOfMonth(now),
    monthTo: startOfMonth(addMonths(now, 1)),
    userId: canSeeTeam ? undefined : session.userId,
  });
  const dailyGoalSecondsByUser = await effectiveDailyGoalSecondsByUser(
    members.map((member) => member.userId),
    now,
    DAILY_GOAL_SECONDS,
  );

  return (
    <TeamList
      members={members.map((member) => ({
        ...member,
        goalSeconds: monthlyGoalSeconds(
          dailyGoalSecondsByUser.get(member.userId) ?? DAILY_GOAL_SECONDS,
          now,
        ),
      }))}
    />
  );
}
