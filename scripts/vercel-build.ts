// Build command on Vercel (package.json "vercel-build"). Runs on every deploy:
//   1. apply pending database migrations (non-destructive: `migrate deploy`)
//   2. run the idempotent seed (reference data + first admin, if configured)
//   3. build the Next.js app
// Each step is labelled, and a failure ends with a plain-language reason so
// the end of the Vercel build log says what went wrong.
import { execSync } from "node:child_process";
import { databaseUrl, databaseVariableNames, directDatabaseUrl } from "../src/lib/runtime-config";

function fail(step: string, why: string): never {
  console.error(`\n✖ Build stopped at: ${step}\n\n${why}\n`);
  process.exit(1);
}

const runtime = databaseUrl();
const direct = directDatabaseUrl();
const names = databaseVariableNames();
console.log(`Database variables found: ${names.length ? names.join(", ") : "(none)"}`);

if (!runtime || !direct) {
  fail(
    "finding the database",
    `  No database connection string was found.
  Fix: Vercel → this project → Storage → connect your Postgres (Neon) database
  to this project for Production AND Preview, then redeploy.
  (Variables are read at build time, so they must exist for this environment.)`,
  );
}

function step(n: number, title: string, cmd: string, url: string, hint: string) {
  console.log(`\n▶ Step ${n}/3: ${title}`);
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  } catch {
    fail(title, hint);
  }
}

step(
  1,
  "database migrations",
  "npx prisma migrate deploy",
  direct,
  `  Could not create or update the database tables (see the Prisma error above).
  Common causes: the database is paused or unreachable, the connection string
  is wrong, or only a pooled connection is available. With Neon, make sure
  DATABASE_URL_UNPOOLED is connected to this project.`,
);
step(
  2,
  "initial data (categories, prices, first admin)",
  "npx tsx prisma/seed.ts",
  direct,
  "  Seeding failed (see the error above). The database tables were created.",
);
step(3, "building the website", "npx next build", runtime, "  The Next.js build failed (see the error above).");
console.log("\n✔ Deploy build finished.");
