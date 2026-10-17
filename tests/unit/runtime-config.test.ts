import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl, databaseUrl, directDatabaseUrl, uploadsEnabled } from "@/lib/runtime-config";

afterEach(() => vi.unstubAllEnvs());

function only(vars: Record<string, string>) {
  for (const k of ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "APP_URL", "VERCEL", "VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) {
    vi.stubEnv(k, vars[k] ?? "");
  }
}

describe("deployment configuration", () => {
  it("prefers an explicit DATABASE_URL", () => {
    only({ DATABASE_URL: "postgres://a", POSTGRES_URL: "postgres://b" });
    expect(databaseUrl()).toBe("postgres://a");
  });

  it("falls back to the variable names Vercel's Postgres integrations set", () => {
    only({ POSTGRES_PRISMA_URL: "postgres://pooled", POSTGRES_URL_NON_POOLING: "postgres://direct" });
    expect(databaseUrl()).toBe("postgres://pooled");
    expect(directDatabaseUrl()).toBe("postgres://direct");
    only({ DATABASE_URL: "postgres://neon-pooled", DATABASE_URL_UNPOOLED: "postgres://neon-direct" });
    expect(directDatabaseUrl()).toBe("postgres://neon-direct");
  });

  it("reports no database when nothing is configured", () => {
    only({});
    expect(databaseUrl()).toBeUndefined();
    expect(directDatabaseUrl()).toBeUndefined();
  });

  it("derives the public URL on Vercel and keeps an explicit APP_URL", () => {
    only({ VERCEL: "1", VERCEL_PROJECT_PRODUCTION_URL: "verk.vercel.app" });
    expect(appUrl()).toBe("https://verk.vercel.app");
    only({ APP_URL: "https://verkvangur.is", VERCEL_PROJECT_PRODUCTION_URL: "verk.vercel.app" });
    expect(appUrl()).toBe("https://verkvangur.is");
    only({});
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("disables local-disk photo uploads on Vercel", () => {
    only({ VERCEL: "1" });
    expect(uploadsEnabled()).toBe(false);
    only({});
    expect(uploadsEnabled()).toBe(true);
  });
});

describe("server env validation", () => {
  it("treats empty variables as unset instead of failing", async () => {
    vi.resetModules();
    vi.stubEnv("ENABLE_DEV_OUTBOX", "");
    vi.stubEnv("MAIL_DRIVER", "");
    vi.stubEnv("DATABASE_URL", "postgres://x");
    const { env } = await import("@/lib/env");
    expect(env().ENABLE_DEV_OUTBOX).toBe("false");
    expect(env().MAIL_DRIVER).toBe("outbox");
  });
});
