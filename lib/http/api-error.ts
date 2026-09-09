import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Revise os dados informados.",
          details: error.flatten(),
        },
      },
      { status: 422 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return Response.json(
        {
          error: {
            code: "CONFLICT",
            message: "Já existe um registro com esses dados.",
          },
        },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Registro não encontrado." } },
        { status: 404 },
      );
    }
    if (error.code === "P2003") {
      return Response.json(
        {
          error: {
            code: "RELATION_CONFLICT",
            message: "A operação conflita com um registro relacionado.",
          },
        },
        { status: 409 },
      );
    }
    if (error.code === "P2023") {
      return Response.json(
        {
          error: {
            code: "INVALID_IDENTIFIER",
            message: "Identificador inválido.",
          },
        },
        { status: 400 },
      );
    }
  }

  console.error("Unhandled API error", error);
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Não foi possível concluir a operação.",
      },
    },
    { status: 500 },
  );
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(
      400,
      "INVALID_JSON",
      "O corpo da requisição não é um JSON válido.",
    );
  }
}
