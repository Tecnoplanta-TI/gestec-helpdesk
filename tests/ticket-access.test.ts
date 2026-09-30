import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { ticketVisibilityWhere } from "@/lib/auth/ticket-access";

const ANA = "00000000-0000-4000-8000-000000000001";
const BRUNO = "00000000-0000-4000-8000-000000000002";

describe("visibilidade de tickets", () => {
  it("técnico só vê ticket em que participa", () => {
    expect(
      ticketVisibilityWhere({ userId: ANA, role: UserRole.TECHNICIAN }),
    ).toEqual({
      OR: [
        { assigneeId: ANA },
        { requesterId: ANA },
        { participants: { some: { userId: ANA, removedAt: null } } },
      ],
    });
    expect(
      ticketVisibilityWhere({ userId: BRUNO, role: UserRole.TECHNICIAN }).OR,
    ).not.toEqual(
      ticketVisibilityWhere({ userId: ANA, role: UserRole.TECHNICIAN }).OR,
    );
  });

  it("administrador, gestor e auditor enxergam a fila inteira", () => {
    for (const role of [UserRole.ADMIN, UserRole.MANAGER, UserRole.AUDITOR]) {
      expect(ticketVisibilityWhere({ userId: ANA, role })).toEqual({});
    }
  });
});
