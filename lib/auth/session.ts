import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { cache } from "react";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http/api-error";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

export interface GestecSession {
  userId: string;
  externalId: string;
  name: string;
  email: string;
  role: UserRole;
}

interface GestecIdentity extends Omit<GestecSession, "userId"> {
  sourceUserId: string;
}

function parseRole(value: string | undefined, fallback?: UserRole): UserRole {
  if (Object.values(UserRole).includes(value as UserRole))
    return value as UserRole;
  if (fallback) return fallback;
  throw new ApiError(
    401,
    "AUTH_INVALID_ROLE",
    "Perfil informado pelo Gestec não é válido.",
  );
}

function developmentIdentity(): GestecIdentity {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.GESTEC_ALLOW_DEV_AUTH !== "true"
  ) {
    throw new ApiError(401, "AUTH_REQUIRED", "Sessão do Gestec não informada.");
  }

  return {
    sourceUserId:
      process.env.GESTEC_DEV_USER_ID ?? "00000000-0000-4000-8000-000000000001",
    externalId: process.env.GESTEC_DEV_EXTERNAL_ID ?? "local-admin",
    name: process.env.GESTEC_DEV_USER_NAME ?? "Administrador local",
    email: process.env.GESTEC_DEV_USER_EMAIL ?? "admin.local@gestec.invalid",
    role: parseRole(process.env.GESTEC_DEV_USER_ROLE, UserRole.TECHNICIAN),
  };
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

const syncedUsers = new Map<
  string,
  { fingerprint: string; at: number; session: GestecSession }
>();
const USER_SYNC_TTL_MS = 60_000;

function identityFingerprint(identity: GestecIdentity) {
  return `${identity.sourceUserId}|${identity.name}|${identity.email}|${identity.role}`;
}

async function resolveLocalSession(identity: GestecIdentity) {
  const fingerprint = identityFingerprint(identity);
  const cached = syncedUsers.get(identity.externalId);
  if (
    cached &&
    cached.fingerprint === fingerprint &&
    Date.now() - cached.at <= USER_SYNC_TTL_MS
  ) {
    return cached.session;
  }

  const user = await prisma.$transaction(async (tx) => {
    const [byExternalId, byEmail] = await Promise.all([
      tx.userRef.findUnique({ where: { externalId: identity.externalId } }),
      tx.userRef.findUnique({ where: { email: identity.email } }),
    ]);
    if (byExternalId && byEmail && byExternalId.id !== byEmail.id) {
      throw new ApiError(
        409,
        "AUTH_IDENTITY_CONFLICT",
        "A identidade do Gestec conflita com outro usuário já sincronizado.",
      );
    }
    const existing = byExternalId ?? byEmail;
    const data = {
      externalId: identity.externalId,
      name: identity.name,
      email: identity.email,
      role: identity.role,
      active: true,
    };
    return existing
      ? tx.userRef.update({ where: { id: existing.id }, data })
      : tx.userRef.create({ data: { id: randomUUID(), ...data } });
  });
  const session: GestecSession = {
    userId: user.id,
    externalId: user.externalId,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  syncedUsers.set(identity.externalId, {
    fingerprint,
    at: Date.now(),
    session,
  });
  return session;
}

export const getGestecSession = cache(
  async function getGestecSession(): Promise<GestecSession> {
    if (process.env.GESTEC_AUTH_MODE === "development") {
      return resolveLocalSession(developmentIdentity());
    }

    const requestHeaders = await headers();
    const userId = requestHeaders.get("x-gestec-user-id") ?? "";
    const externalId = requestHeaders.get("x-gestec-external-id") ?? userId;
    const name = requestHeaders.get("x-gestec-user-name") ?? "";
    const email = requestHeaders.get("x-gestec-user-email") ?? "";
    const role = requestHeaders.get("x-gestec-user-role") ?? "";
    const timestamp = requestHeaders.get("x-gestec-timestamp") ?? "";
    const signature = requestHeaders.get("x-gestec-signature") ?? "";
    const secret = process.env.GESTEC_AUTH_SHARED_SECRET;

    if (!userId || !name || !email || !timestamp || !signature || !secret) {
      throw new ApiError(401, "AUTH_REQUIRED", "Sessão do Gestec incompleta.");
    }

    const requestTime = Number(timestamp);
    if (
      !Number.isFinite(requestTime) ||
      Math.abs(Date.now() - requestTime) > 300_000
    ) {
      throw new ApiError(401, "AUTH_EXPIRED", "Assinatura de sessão expirada.");
    }

    const canonical = [userId, externalId, name, email, role, timestamp].join(
      "\n",
    );
    const expected = createHmac("sha256", secret)
      .update(canonical)
      .digest("hex");
    if (!safeEqual(signature, expected)) {
      throw new ApiError(401, "AUTH_INVALID", "Assinatura de sessão inválida.");
    }

    return resolveLocalSession({
      sourceUserId: userId,
      externalId,
      name,
      email,
      role: parseRole(role),
    });
  },
);

export async function requirePermission(permission: Permission) {
  const session = await getGestecSession();
  if (!hasPermission(session.role, permission)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Você não possui permissão para esta ação.",
    );
  }

  return session;
}
