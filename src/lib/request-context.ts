import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. Assumes the app runs behind a
 * reverse proxy that sets X-Forwarded-For (see docs/OPERATIONS.md); only the
 * left-most entry is used.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
