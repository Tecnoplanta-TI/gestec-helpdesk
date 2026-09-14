import { describe, expect, it } from "vitest";

import { selectEffectiveGoalSeconds } from "@/lib/domain/time-goals";

describe("effective goals", () => {
  it("uses an individual goal before a group goal", () => {
    const result = selectEffectiveGoalSeconds(
      ["user-1"],
      [
        {
          targetSeconds: 100,
          targetUserId: "user-1",
          targetGroup: null,
        },
        {
          targetSeconds: 200,
          targetUserId: null,
          targetGroup: { members: [{ userId: "user-1" }] },
        },
      ],
      300,
    );
    expect(result.get("user-1")).toBe(100);
  });

  it("uses the newest matching group goal and then the fallback", () => {
    const result = selectEffectiveGoalSeconds(
      ["group-member", "without-goal"],
      [
        {
          targetSeconds: 200,
          targetUserId: null,
          targetGroup: { members: [{ userId: "group-member" }] },
        },
        {
          targetSeconds: 150,
          targetUserId: null,
          targetGroup: { members: [{ userId: "group-member" }] },
        },
      ],
      300,
    );
    expect(result.get("group-member")).toBe(200);
    expect(result.get("without-goal")).toBe(300);
  });
});
