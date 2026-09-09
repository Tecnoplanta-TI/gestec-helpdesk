import { createHash, randomUUID } from "node:crypto";
import { access, constants, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { ApiError } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";
import { addTicketHistory } from "@/lib/domain/ticket-history";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_BYTES = 10 * 1024 * 1024;

function hasPrefix(bytes: Buffer, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

function validateFileContent(bytes: Buffer, mimeType: string) {
  const zipDirectory = bytes.toString("latin1");
  const validOfficeDocument =
    hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04]) &&
    zipDirectory.includes("[Content_Types].xml") &&
    (mimeType.endsWith("spreadsheetml.sheet")
      ? zipDirectory.includes("xl/")
      : zipDirectory.includes("word/"));
  const valid =
    (mimeType === "application/pdf" &&
      bytes.subarray(0, 5).toString("ascii") === "%PDF-") ||
    (mimeType === "image/png" &&
      hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (mimeType === "image/jpeg" && hasPrefix(bytes, [0xff, 0xd8, 0xff])) ||
    (mimeType === "image/gif" &&
      ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))) ||
    (mimeType === "image/webp" &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP") ||
    ([
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(mimeType) &&
      validOfficeDocument) ||
    (["text/plain", "text/csv"].includes(mimeType) && !bytes.includes(0));

  if (!valid) {
    throw new ApiError(
      422,
      "FILE_CONTENT_MISMATCH",
      "O conteúdo do arquivo não corresponde ao tipo informado.",
    );
  }
}

function storageRoot() {
  return (
    process.env.ATTACHMENT_ROOT ??
    path.join(process.cwd(), "storage", "attachments")
  );
}

export async function saveTicketAttachment(input: {
  ticketId: string;
  userId: string;
  file: File;
  requestKey: string;
}) {
  const ticketExists = await prisma.ticket.count({
    where: { id: input.ticketId },
  });
  if (!ticketExists)
    throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
  if (input.file.size <= 0 || input.file.size > MAX_BYTES) {
    throw new ApiError(413, "FILE_TOO_LARGE", "O arquivo deve ter até 10 MB.");
  }
  const mimeType = input.file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new ApiError(
      422,
      "FILE_TYPE_NOT_ALLOWED",
      "Tipo de arquivo não permitido.",
    );
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  validateFileContent(bytes, mimeType);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const replay = await prisma.ticketAttachment.findUnique({
    where: { requestKey: input.requestKey },
  });
  if (replay) {
    if (
      replay.ticketId !== input.ticketId ||
      replay.uploadedById !== input.userId ||
      replay.checksum !== checksum ||
      replay.originalName !== input.file.name.slice(0, 200)
    ) {
      throw new ApiError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "Esta chave já foi usada em outro anexo.",
      );
    }
    return replay;
  }
  const id = randomUUID();
  const storageKey = `${input.ticketId}/${id}`;
  const absolute = path.join(storageRoot(), storageKey);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);

  try {
    return await prisma.$transaction(async (tx) => {
      const attachment = await tx.ticketAttachment.create({
        data: {
          id,
          ticketId: input.ticketId,
          storageKey,
          originalName: input.file.name.slice(0, 200),
          mimeType,
          sizeBytes: bytes.length,
          checksum,
          requestKey: input.requestKey,
          uploadedById: input.userId,
        },
      });
      await addTicketHistory(tx, {
        ticketId: input.ticketId,
        action: "ATTACHMENT_ADDED",
        actorId: input.userId,
        details: {
          attachmentId: attachment.id,
          originalName: attachment.originalName,
          sizeBytes: attachment.sizeBytes,
        },
      });
      return attachment;
    });
  } catch (error) {
    await unlink(absolute).catch(() => undefined);
    throw error;
  }
}

export async function getAttachmentFile(attachmentId: string) {
  const attachment = await prisma.ticketAttachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment || attachment.deletedAt)
    throw new ApiError(404, "ATTACHMENT_NOT_FOUND", "Anexo não encontrado.");
  const absolutePath = path.join(storageRoot(), attachment.storageKey);
  try {
    await access(absolutePath, constants.R_OK);
  } catch {
    throw new ApiError(
      404,
      "ATTACHMENT_FILE_MISSING",
      "O arquivo do anexo não está mais disponível.",
    );
  }
  return { attachment, absolutePath };
}

export async function removeTicketAttachment(input: {
  attachmentId: string;
  ticketId: string;
  userId: string;
  canManage: boolean;
}) {
  const { attachmentId, ticketId, userId, canManage } = input;
  const attachment = await prisma.ticketAttachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment || attachment.ticketId !== ticketId || attachment.deletedAt) {
    throw new ApiError(404, "ATTACHMENT_NOT_FOUND", "Anexo não encontrado.");
  }
  if (attachment.uploadedById !== userId && !canManage) {
    throw new ApiError(
      403,
      "ATTACHMENT_DELETE_FORBIDDEN",
      "Somente o autor ou um gestor pode remover este anexo.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticketAttachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });
    await addTicketHistory(tx, {
      ticketId: attachment.ticketId,
      action: "ATTACHMENT_REMOVED",
      actorId: userId,
      details: { attachmentId, originalName: attachment.originalName },
    });
  });

  try {
    await unlink(path.join(storageRoot(), attachment.storageKey));
  } catch {
    // The logical record remains; a missing file should not undo the audit trail.
  }
  return attachment;
}
