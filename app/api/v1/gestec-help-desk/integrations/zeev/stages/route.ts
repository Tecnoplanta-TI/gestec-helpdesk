import {
  assertBearerToken,
  receiveZeevStageReady,
} from "@/lib/domain/integrations";
import { zeevStageReadySchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(request: Request) {
  try {
    assertBearerToken(request, process.env.ZEEV_INBOUND_TOKEN);
    const input = zeevStageReadySchema.parse(await readJson(request));
    return Response.json(await receiveZeevStageReady(input));
  } catch (error) {
    return errorResponse(error);
  }
}
