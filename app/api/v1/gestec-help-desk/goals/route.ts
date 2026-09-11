import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { createNotification } from "@/lib/domain/notifications";
import { dateOnlyToUtc } from "@/lib/domain/project-rates";
import { timeGoalSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

async function permittedGroupIds(userId: string, isAdmin: boolean) {
  if (isAdmin) return undefined;
  const groups = await prisma.userGroup.findMany({ where: { managerId: userId, active: true }, select: { id: true } });
  return groups.map((group) => group.id);
}

export async function GET() {
  try {
    const session = await requirePermission("goals:view");
    const isAdmin = hasPermission(session.role, "admin:manage");
    const allowedGroups = await permittedGroupIds(session.userId, isAdmin);
    const goals = await prisma.timeGoal.findMany({
      where: isAdmin ? {} : { OR: [{ targetUserId: session.userId }, { targetGroupId: { in: allowedGroups } }] },
      include: { targetUser: { select: { id: true, name: true } }, targetGroup: { select: { id: true, name: true } }, project: { select: { name: true } }, client: { select: { name: true } } },
      orderBy: [{ active: "desc" }, { startsOn: "desc" }],
    });
    return Response.json(goals);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("goals:manage");
    const input = timeGoalSchema.parse(await readJson(request));
    const isAdmin = hasPermission(session.role, "admin:manage");
    if (!isAdmin && input.targetUserId !== session.userId) {
      const allowedGroups = await permittedGroupIds(session.userId, false);
      if (!input.targetGroupId || !allowedGroups?.includes(input.targetGroupId)) throw new ApiError(403, "GOAL_FORBIDDEN", "Você só pode definir metas para você ou seus grupos.");
    }
    const goal = await prisma.$transaction(async (tx) => {
      const created = await tx.timeGoal.create({ data: { ...input, startsOn: dateOnlyToUtc(input.startsOn), endsOn: dateOnlyToUtc(input.endsOn), createdById: session.userId } });
      const recipientIds = input.targetUserId ? [input.targetUserId] : (await tx.userGroupMember.findMany({ where: { userGroupId: input.targetGroupId! }, select: { userId: true } })).map((member) => member.userId);
      await Promise.all(recipientIds.map((recipientId) => createNotification({ recipientId, title: "Nova meta de horas", description: `A meta “${created.title}” foi definida para o período informado.`, source: "Metas", priority: "NORMAL", resourceType: "TimeGoal", resourceId: created.id, href: "/gestec_help_desk/jornada" }, tx)));
      return created;
    });
    return Response.json(goal, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
