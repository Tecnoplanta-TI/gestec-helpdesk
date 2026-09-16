import { AppShell } from "@/components/app-shell";
import { getGestecSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/http/api-error";
import { redirect } from "next/navigation";
import { isZeevSyncEnabled } from "@/lib/features/zeev";

// Every page in this segment depends on the request-scoped Gestec identity.
// Keeping the segment dynamic prevents redirect-only child pages from being
// prerendered without authentication headers during `next build`.
export const dynamic = "force-dynamic";

export default async function HelpDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getGestecSession();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login");
    }
    throw error;
  }
  if (process.env.NODE_ENV !== "test" && isZeevSyncEnabled()) {
    const { startZeevSyncWorker } = await import("@/lib/jobs/zeev-sync-queue");
    // The application remains available if the queue is temporarily down.
    // Outbound executions are durable in PostgreSQL and are picked up from the
    // backlog when the worker can start again.
    void startZeevSyncWorker().catch((error) => {
      console.error(
        "Não foi possível iniciar o worker de sincronização do Zeev.",
        error,
      );
    });
  }
  return (
    <AppShell
      user={{ name: session.name, email: session.email, role: session.role }}
    >
      {children}
    </AppShell>
  );
}
