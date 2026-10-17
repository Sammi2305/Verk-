// Build command on Vercel (package.json "vercel-build"). Runs on every deploy:
//   1. apply pending database migrations (non-destructive: `migrate deploy`)
//   2. run the idempotent seed (reference data + first admin, if configured)
//   3. build the Next.js app
// If no database is connected, the build stops with a clear message instead
// of publishing a site where every page fails.
import { execSync } from "node:child_process";
import { databaseUrl, directDatabaseUrl } from "../src/lib/runtime-config";

const runtime = databaseUrl();
const direct = directDatabaseUrl();

if (!runtime || !direct) {
  console.error(`
✖ No database is connected to this Vercel project.

  Fix: Vercel dashboard → this project → Storage → Create Database →
  Neon (Postgres) → connect it to the project (Production and Preview),
  then redeploy. See docs/OPERATIONS.md → "Deploying on Vercel".
`);
  process.exit(1);
}

function run(cmd: string, url: string) {
  execSync(cmd, { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}

run("npx prisma migrate deploy", direct);
run("npx tsx prisma/seed.ts", direct);
if (!process.env.SEED_ADMIN_EMAIL) {
  console.warn("⚠ SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set: no administrator account will be created.");
}
run("npx next build", runtime);
