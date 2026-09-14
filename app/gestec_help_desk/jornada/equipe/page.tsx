import { addMonths, startOfMonth } from "date-fns";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { monthlyGoalSeconds } from "@/lib/domain/time-goals";
import { effectiveGoalSecondsByUser } from "@/lib/domain/effective-goals";
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
  const fallbackGoalSeconds = monthlyGoalSeconds(now);
  const goalSecondsByUser = await effectiveGoalSecondsByUser(
    members.map((member) => member.userId),
    now,
    fallbackGoalSeconds,
  );

  return (
    <TeamList
      members={members.map((member) => ({
        ...member,
        goalSeconds:
          goalSecondsByUser.get(member.userId) ?? fallbackGoalSeconds,
      }))}
    />
  );
}
