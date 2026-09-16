import { ApiError } from "@/lib/http/api-error";

/**
 * Zeev is intentionally opt-in. The production launch runs only Jornada, so
 * no process is started and no external callback can be accepted unless this
 * flag is explicitly enabled in a future release.
 */
export function isZeevSyncEnabled() {
  return process.env.ZEEV_SYNC_ENABLED === "true";
}

export function requireZeevSyncEnabled() {
  if (!isZeevSyncEnabled()) {
    throw new ApiError(404, "ZEEV_SYNC_DISABLED", "Integração Zeev indisponível.");
  }
}
