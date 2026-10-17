import "server-only";
import { z } from "zod";
import { appUrl, databaseUrl } from "@/lib/runtime-config";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  MAIL_DRIVER: z.enum(["outbox"]).default("outbox"),
  MAIL_FROM: z.string().default("Verkvangur <noreply@example.is>"),
  ENABLE_DEV_OUTBOX: z.enum(["true", "false"]).default("false"),
  UPLOAD_DIR: z.string().default("./storage/uploads"),
});

let cached: z.infer<typeof schema> | undefined;

/** Server-side configuration, validated once. Never import from client code. */
export function env() {
  if (!cached) {
    // Treat empty values as unset (an empty variable in a hosting dashboard
    // should fall back to the default, not crash every page).
    const defined = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
    cached = schema.parse({ ...defined, DATABASE_URL: databaseUrl(), APP_URL: appUrl() });
  }
  return cached;
}

/** False while e-mails are only captured (no provider connected yet). */
export function emailDeliveryLive() {
  return env().MAIL_DRIVER !== "outbox";
}

/** The dev outbox page must never be reachable in production. */
export function devOutboxEnabled() {
  const e = env();
  return e.NODE_ENV !== "production" && e.ENABLE_DEV_OUTBOX === "true";
}
