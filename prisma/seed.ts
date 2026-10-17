// Seeds reference data and the first administrator. Idempotent: it never
// overwrites values an administrator has since changed, and creates no fake
// tradespeople, reviews or statistics.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { areas, categories, plans } from "./reference-data";

const db = new PrismaClient();

async function main() {
  for (const [i, c] of categories.entries()) {
    await db.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, sortOrder: i } });
  }
  for (const [i, a] of areas.entries()) {
    await db.area.upsert({ where: { slug: a.slug }, update: {}, create: { ...a, sortOrder: i } });
  }
  for (const p of plans) {
    await db.plan.upsert({ where: { code: p.code }, update: {}, create: p });
  }
  await db.platformSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  await seedAdmin();
  console.log("Seed complete.");
}

/**
 * Creates the first administrator from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * Problems only warn (they never fail a deploy); an existing admin is never changed.
 */
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set — no administrator created");
    return;
  }
  if (password.length < 12) {
    console.warn("⚠ SEED_ADMIN_PASSWORD is shorter than 12 characters — no administrator created. Set a longer password and redeploy.");
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.warn(`⚠ SEED_ADMIN_EMAIL "${email}" is not a valid e-mail address — no administrator created.`);
    return;
  }
  if (await db.user.findUnique({ where: { email } })) {
    console.log(`Administrator ${email} already exists — unchanged`);
    return;
  }
  await db.user.create({
    data: {
      email,
      name: process.env.SEED_ADMIN_NAME || "Kerfisstjóri",
      role: "ADMIN",
      passwordHash: await hashPassword(password),
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`Created administrator ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
