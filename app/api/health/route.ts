import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("Health check indisponível.", error);
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
