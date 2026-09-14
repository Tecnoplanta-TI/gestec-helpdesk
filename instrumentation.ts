export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NODE_ENV === "test"
  ) {
    return;
  }

  const { startZeevSyncWorker } = await import("@/lib/jobs/zeev-sync-queue");
  void startZeevSyncWorker().catch((error) => {
    console.error(
      "Não foi possível iniciar o worker de sincronização do Zeev.",
      error,
    );
  });
}
