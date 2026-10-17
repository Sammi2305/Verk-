// Deployment-aware configuration shared by the app and scripts/vercel-build.ts.
// No secrets are exposed: these helpers only run on the server / at build time.

/**
 * Database URL used at runtime. An explicit DATABASE_URL wins (local dev, most
 * hosts). On Vercel, the Postgres integrations set other names: Neon sets
 * DATABASE_URL, Supabase sets POSTGRES_PRISMA_URL / POSTGRES_URL.
 */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || undefined;
}

/** Direct (non-pooled) URL for migrations, which need session-level locks. */
export function directDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || databaseUrl();
}

/** Public base URL: APP_URL, else the Vercel production domain, else localhost. */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercelHost ? `https://${vercelHost}` : "http://localhost:3000";
}

/**
 * Vercel's filesystem is read-only and not shared between instances, so the
 * local-disk image store cannot work there. Photo uploads stay off on Vercel
 * until object storage is configured (see docs/OPERATIONS.md).
 */
export function uploadsEnabled(): boolean {
  return !process.env.VERCEL;
}
