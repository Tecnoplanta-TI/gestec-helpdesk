import type { ReactNode } from "react";

import { AdminSubnav } from "@/components/admin/admin-subnav";
import { requirePermission } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePermission("admin:manage");
  return (
    <div className="flex flex-col gap-6">
      <AdminSubnav />
      {children}
    </div>
  );
}
