type RequestLike = Pick<Request, "headers" | "url">;

function configuredOrigin(value = process.env.APP_URL) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function publicUrl(
  request: RequestLike,
  pathname: string,
  appUrl = process.env.APP_URL,
) {
  const origin = configuredOrigin(appUrl);
  if (origin) return new URL(pathname, origin);

  const protocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host");

  if (host && (protocol === "https" || protocol === "http")) {
    return new URL(pathname, `${protocol}://${host}`);
  }

  return new URL(pathname, request.url);
}
