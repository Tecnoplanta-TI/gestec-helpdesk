import {
  receiveZeevTicket,
  assertBearerToken,
} from "@/lib/domain/integrations";
import { zeevTicketSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(request: Request) {
  try {
    assertBearerToken(request, process.env.ZEEV_INBOUND_TOKEN);
    const input = zeevTicketSchema.parse(await readJson(request));
    const result = await receiveZeevTicket(input);
    return Response.json(result, { status: result.replay ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
