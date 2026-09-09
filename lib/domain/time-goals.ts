import { addDays, addMonths, startOfMonth } from "date-fns";

export const DAILY_GOAL_SECONDS = 6 * 60 * 60;

export function isWeekday(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function countWeekdays(from: Date, toExclusive: Date) {
  let count = 0;
  for (
    let cursor = new Date(from.getTime());
    cursor < toExclusive;
    cursor = addDays(cursor, 1)
  ) {
    if (isWeekday(cursor)) count += 1;
  }
  return count;
}

export function monthlyGoalSeconds(now = new Date()) {
  const from = startOfMonth(now);
  const to = startOfMonth(addMonths(now, 1));
  return countWeekdays(from, to) * DAILY_GOAL_SECONDS;
}

export function goalProgressPercent(seconds: number, goalSeconds: number) {
  if (goalSeconds <= 0) return 0;
  return Math.min(100, Math.round((seconds / goalSeconds) * 100));
}
