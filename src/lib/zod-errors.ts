import type { ZodError } from "zod";
import { tError } from "@/i18n";

/** Maps zod issues to { field: translated message } (first issue per field). */
export function fieldErrorsFrom(error: ZodError, params?: Record<string, string | number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (out[key]) continue;
    let msg = tError(issue.message) ?? issue.message;
    if (params) msg = msg.replace(/\{(\w+)\}/g, (_, n: string) => String(params[n] ?? `{${n}}`));
    // zod's built-in messages (english) are replaced by a generic Icelandic one.
    if (msg === issue.message && /[a-z]{3,} [a-z]{3,}/i.test(msg) && !/[áðéíóúýþæö]/i.test(msg)) msg = tError("required")!;
    out[key] = msg;
  }
  return out;
}
