import {
  assertBearerToken,
  receiveZeevEvaluation,
} from "@/lib/domain/integrations";
import { evaluationSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(request: Request) {
  try {
    assertBearerToken(request, process.env.ZEEV_INBOUND_TOKEN);
    const input = evaluationSchema.parse(await readJson(request));
    return Response.json(await receiveZeevEvaluation(input));
  } catch (error) {
    return errorResponse(error);
  }
}
