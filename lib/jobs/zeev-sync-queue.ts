import { PgBoss } from "pg-boss";

import { prisma } from "@/lib/prisma";
import { isZeevSyncEnabled } from "@/lib/features/zeev";

const QUEUE_NAME = "zeev-outbound-sync";
const DEAD_LETTER_QUEUE = "zeev-outbound-sync-dead-letter";

type ZeevSyncJob = {
  idempotencyKey: string;
};

const globalForJobs = globalThis as unknown as {
  gestecPgBoss?: Promise<PgBoss>;
  gestecZeevWorker?: Promise<void>;
};

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value)
    throw new Error(
      "DATABASE_URL não está configurada para a fila de sincronização.",
    );
  return value;
}

async function createBoss() {
  const boss = new PgBoss({
    connectionString: databaseUrl(),
    application_name: "gestec-helpdesk-jobs",
  });
  boss.on("error", (error) => {
    console.error("Falha no gerenciador de jobs do Gestec Help Desk.", error);
  });
  await boss.start();
  await boss.createQueue(DEAD_LETTER_QUEUE, {
    retryLimit: 0,
    retentionSeconds: 2_592_000,
    deleteAfterSeconds: 2_592_000,
  });
  await boss.createQueue(QUEUE_NAME, {
    policy: "key_strict_fifo",
    deadLetter: DEAD_LETTER_QUEUE,
    retryLimit: 8,
    retryDelay: 5,
    retryBackoff: true,
    retryDelayMax: 900,
    expireInSeconds: 60,
    retentionSeconds: 2_592_000,
    deleteAfterSeconds: 604_800,
  });
  return boss;
}

async function getBoss() {
  globalForJobs.gestecPgBoss ??= createBoss().catch((error) => {
    delete globalForJobs.gestecPgBoss;
    throw error;
  });
  return globalForJobs.gestecPgBoss;
}

async function enqueueExistingExecution(idempotencyKey: string) {
  const execution = await prisma.syncExecution.findUnique({
    where: { idempotencyKey },
    select: { ticketId: true, status: true },
  });
  if (!execution || execution.status === "SUCCEEDED") return null;

  const boss = await getBoss();
  return boss.send(QUEUE_NAME, { idempotencyKey } satisfies ZeevSyncJob, {
    singletonKey: execution.ticketId ?? `integration:${idempotencyKey}`,
  });
}

export async function enqueueZeevSync(idempotencyKeys: string[]) {
  if (process.env.NODE_ENV === "test" || !isZeevSyncEnabled()) return;
  void startZeevSyncWorker().catch((error) => {
    console.error(
      "O worker do Zeev não iniciou; o backlog será retomado depois.",
      error,
    );
  });
  try {
    for (const idempotencyKey of [...new Set(idempotencyKeys)]) {
      await enqueueExistingExecution(idempotencyKey);
    }
  } catch (error) {
    // The SyncExecution row is the durable outbox. Do not turn an already
    // committed ticket mutation into an HTTP failure just because the queue is
    // momentarily unavailable; a later worker start re-enqueues the backlog.
    console.error(
      "Não foi possível enfileirar a sincronização do Zeev; execução mantida pendente.",
      error,
    );
  }
}

async function enqueueBacklog() {
  const staleBefore = new Date(Date.now() - 120_000);
  const pending = await prisma.syncExecution.findMany({
    where: {
      direction: "OUTBOUND",
      OR: [
        { status: { in: ["PENDING", "FAILED"] } },
        { status: "PROCESSING", processingStartedAt: { lt: staleBefore } },
      ],
    },
    select: { idempotencyKey: true },
    orderBy: { createdAt: "asc" },
    take: 1_000,
  });
  for (const execution of pending) {
    await enqueueExistingExecution(execution.idempotencyKey);
  }
}

async function registerWorker() {
  if (process.env.NODE_ENV === "test") return;
  const boss = await getBoss();
  await boss.work<ZeevSyncJob>(
    QUEUE_NAME,
    { batchSize: 1, pollingIntervalSeconds: 2 },
    async ([job]) => {
      if (!job) return;
      const { dispatchPendingZeevSync } = await import("@/lib/domain/tickets");
      const execution = await dispatchPendingZeevSync(job.data.idempotencyKey);
      if (
        execution?.status === "FAILED" ||
        execution?.status === "PROCESSING"
      ) {
        throw new Error(
          execution.lastError ??
            (execution.status === "PROCESSING"
              ? "A sincronização com o Zeev já está em andamento."
              : "A sincronização com o Zeev falhou."),
        );
      }
    },
  );
  await enqueueBacklog();
}

export async function startZeevSyncWorker() {
  if (!isZeevSyncEnabled()) return;
  globalForJobs.gestecZeevWorker ??= registerWorker().catch((error) => {
    delete globalForJobs.gestecZeevWorker;
    throw error;
  });
  return globalForJobs.gestecZeevWorker;
}
