export const DAILY_GOAL_SECONDS = 6 * 60 * 60;

export function daysInMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function monthlyGoalSeconds(
  dailyGoalSeconds = DAILY_GOAL_SECONDS,
  month = new Date(),
) {
  return daysInMonth(month) * dailyGoalSeconds;
}

export function elapsedDaysInMonth(date = new Date()) {
  return Math.min(date.getDate(), daysInMonth(date));
}

export function elapsedMonthlyGoalSeconds(
  dailyGoalSeconds = DAILY_GOAL_SECONDS,
  date = new Date(),
) {
  return elapsedDaysInMonth(date) * dailyGoalSeconds;
}

export function goalProgressPercent(seconds: number, goalSeconds: number) {
  if (goalSeconds <= 0) return 0;
  return Math.min(100, Math.round((seconds / goalSeconds) * 100));
}

export type GoalCandidate = {
  targetSeconds: number;
  targetUserId: string;
};

export function selectEffectiveDailyGoalSeconds(
  userIds: string[],
  goals: GoalCandidate[],
  fallbackSeconds: number,
) {
  const result = new Map(userIds.map((userId) => [userId, fallbackSeconds]));
  const usersWithGoal = new Set<string>();
  for (const goal of goals) {
    if (
      result.has(goal.targetUserId) &&
      !usersWithGoal.has(goal.targetUserId)
    ) {
      result.set(goal.targetUserId, goal.targetSeconds);
      usersWithGoal.add(goal.targetUserId);
    }
  }

  return result;
}
