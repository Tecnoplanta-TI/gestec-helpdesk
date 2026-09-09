"use client";

type ApiErrorBody = {
  error?: { message?: string };
};

export async function apiRequest<T = unknown>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("content-type")
  ) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, { ...init, headers });
  if (response.status === 204) return null as T;

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await response.json().catch(() => ({}))) as ApiErrorBody)
    : await response.text();
  if (!response.ok) {
    const message =
      typeof body === "object" && body?.error?.message
        ? body.error.message
        : "Não foi possível concluir a ação.";
    throw new Error(message);
  }
  return body as T;
}
