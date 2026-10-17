// Deployment-aware configuration shared by the app and scripts/vercel-build.ts.
// No secrets are exposed: these helpers only run on the server / at build time.

const isPostgresUrl = (v: string | undefined): v is string => !!v && /^postgres(ql)?:\/\//.test(v);

/**
 * First postgres URL among the given variable names, also accepting the
 * custom prefix Vercel can add when a database is connected
 * (e.g. STORAGE_DATABASE_URL for DATABASE_URL).
 */
function findUrl(names: string[]): string | undefined {
  for (const name of names) if (isPostgresUrl(process.env[name])) return process.env[name];
  const keys = Object.keys(process.env).sort();
  for (const name of names) {
    const key = keys.find((k) => k.endsWith(`_${name}`) && isPostgresUrl(process.env[k]));
    if (key) return process.env[key];
  }
  return undefined;
}

/**
 * Database URL used at runtime. An explicit DATABASE_URL wins (local dev, most
 * hosts). On Vercel, the Postgres integrations set other names: Neon sets
 * DATABASE_URL, Supabase sets POSTGRES_PRISMA_URL / POSTGRES_URL.
 */
export function databaseUrl(): string | undefined {
  return findUrl(["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"]);
}

/**
 * Direct (non-pooled) URL for migrations, which need session-level locks.
 * If only a Neon pooled URL exists, derive the direct one (Neon's pooled host
 * is the direct host with "-pooler" added).
 */
export function directDatabaseUrl(): string | undefined {
  const direct = findUrl(["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"]);
  if (direct) return direct;
  const pooled = databaseUrl();
  return pooled?.replace(/(@[^/@]*?)-pooler\./, "$1.");
}

/** Names (never values) of database-looking variables, for build diagnostics. */
export function databaseVariableNames(): string[] {
  return Object.keys(process.env)
    .filter((k) => /DATABASE|POSTGRES|PG/.test(k))
    .sort();
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
