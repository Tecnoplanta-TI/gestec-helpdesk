import {
  assertBearerToken,
  receiveZeevEvaluation,
} from "@/lib/domain/integrations";
import { evaluationSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";
import { requireZeevSyncEnabled } from "@/lib/features/zeev";

export async function POST(request: Request) {
  try {
    requireZeevSyncEnabled();
    assertBearerToken(request, process.env.ZEEV_INBOUND_TOKEN);
    const input = evaluationSchema.parse(await readJson(request));
    return Response.json(await receiveZeevEvaluation(input));
  } catch (error) {
    return errorResponse(error);
  }
}
