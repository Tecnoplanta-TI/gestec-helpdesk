import { cache } from "react";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const listAssignableUsers = cache(async function listAssignableUsers() {
  return prisma.userRef.findMany({
    where: {
      active: true,
      role: { in: [UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN] },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
});
