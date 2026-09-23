import { describe, expect, it } from "vitest";

import {
  AssetStatus,
  TicketPriority,
  TicketStatus,
  TimeEntrySource,
  TimeEntryStatus,
  UserRole,
} from "@/lib/client-enums";

describe("client enums", () => {
  it("exposes the enum values used by browser components", () => {
    expect(UserRole.ADMIN).toBe("ADMIN");
    expect(TicketPriority.HIGH).toBe("HIGH");
    expect(TicketStatus.IN_PROGRESS).toBe("IN_PROGRESS");
    expect(TimeEntrySource.MANUAL).toBe("MANUAL");
    expect(TimeEntryStatus.VALID).toBe("VALID");
    expect(AssetStatus.IN_USE).toBe("IN_USE");
  });
});
