import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { createNotification } from "@/lib/domain/notifications";
import { dateOnlyToUtc } from "@/lib/domain/project-rates";
import { timeGoalSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requirePermission("goals:view");
    const isAdmin = hasPermission(session.role, "admin:manage");
    const goals = await prisma.timeGoal.findMany({
      where: isAdmin ? {} : { targetUserId: session.userId },
      include: {
        targetUser: { select: { id: true, name: true } },
        project: { select: { name: true } },
        client: { select: { name: true } },
      },
      orderBy: [{ active: "desc" }, { startsOn: "desc" }],
    });
    return Response.json(goals);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("goals:manage");
    const input = timeGoalSchema.parse(await readJson(request));
    if (
      !hasPermission(session.role, "admin:manage") &&
      input.targetUserId !== session.userId
    ) {
      throw new ApiError(
        403,
        "GOAL_FORBIDDEN",
        "Você só pode definir metas para você.",
      );
    }
    const goal = await prisma.$transaction(async (tx) => {
      const created = await tx.timeGoal.create({
        data: {
          ...input,
          startsOn: dateOnlyToUtc(input.startsOn),
          endsOn: input.endsOn ? dateOnlyToUtc(input.endsOn) : null,
          createdById: session.userId,
        },
        include: {
          targetUser: { select: { id: true, name: true } },
          project: { select: { name: true } },
          client: { select: { name: true } },
        },
      });
      await Promise.all(
        [input.targetUserId].map((recipientId) =>
          createNotification(
            {
              recipientId,
              title: "Nova meta de horas",
              description: input.permanent
                ? `A meta permanente “${created.title}” foi definida.`
                : `A meta “${created.title}” foi definida para o período informado.`,
              source: "Metas",
              priority: "NORMAL",
              resourceType: "TimeGoal",
              resourceId: created.id,
              href: "/gestec_help_desk/jornada",
            },
            tx,
          ),
        ),
      );
      return created;
    });
    return Response.json(goal, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
