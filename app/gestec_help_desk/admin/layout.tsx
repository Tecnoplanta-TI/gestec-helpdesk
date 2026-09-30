import type { ReactNode } from "react";

import { requirePagePermission } from "@/lib/auth/page-session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePagePermission("admin:manage");
  return children;
}
