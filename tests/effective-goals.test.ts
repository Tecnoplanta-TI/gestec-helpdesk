import { describe, expect, it } from "vitest";

import { selectEffectiveDailyGoalSeconds } from "@/lib/domain/time-goals";

describe("effective goals", () => {
  it("uses the newest individual goal", () => {
    const result = selectEffectiveDailyGoalSeconds(
      ["user-1"],
      [
        {
          targetSeconds: 100,
          targetUserId: "user-1",
        },
        {
          targetSeconds: 200,
          targetUserId: "user-1",
        },
      ],
      300,
    );
    expect(result.get("user-1")).toBe(100);
  });

  it("uses the fallback for a user without an individual goal", () => {
    const result = selectEffectiveDailyGoalSeconds(
      ["user-with-goal", "without-goal"],
      [
        {
          targetSeconds: 200,
          targetUserId: "user-with-goal",
        },
        {
          targetSeconds: 150,
          targetUserId: "user-with-goal",
        },
      ],
      300,
    );
    expect(result.get("user-with-goal")).toBe(200);
    expect(result.get("without-goal")).toBe(300);
  });
});
