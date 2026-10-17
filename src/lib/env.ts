import "server-only";
import { z } from "zod";

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
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

/** The dev outbox page must never be reachable in production. */
export function devOutboxEnabled() {
  const e = env();
  return e.NODE_ENV !== "production" && e.ENABLE_DEV_OUTBOX === "true";
}
