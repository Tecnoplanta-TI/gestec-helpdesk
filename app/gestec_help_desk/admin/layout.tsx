import type { ReactNode } from "react";

import { AdminSubnav } from "@/components/admin/admin-subnav";
import { requirePagePermission } from "@/lib/auth/page-session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePagePermission("admin:manage");
  return (
    <div className="flex flex-col gap-6">
      <AdminSubnav />
      {children}
    </div>
  );
}
