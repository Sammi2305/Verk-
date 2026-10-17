import { execSync } from "node:child_process";

/**
 * Prepares the dedicated e2e database without destroying data: applies
 * pending migrations and runs the idempotent seed. Tests use unique names per
 * run, so data left from earlier runs does not interfere.
 */
export default function globalSetup() {
  const run = (cmd: string) => execSync(`npx dotenv -e .env.e2e -- ${cmd}`, { stdio: "inherit" });
  run("prisma migrate deploy");
  run("tsx prisma/seed.ts");
  // All local requests share one client IP, so repeated runs would otherwise
  // trip the (intentional) registration/login rate limits.
  execSync(`npx dotenv -e .env.e2e -- prisma db execute --stdin --schema prisma/schema.prisma`, { input: "DELETE FROM rate_limits;", stdio: ["pipe", "inherit", "inherit"] });
}
