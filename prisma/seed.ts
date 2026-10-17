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

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
    const existing = await db.user.findUnique({ where: { email } });
    if (!existing) {
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
    } else {
      console.log(`Administrator ${email} already exists — unchanged`);
    }
  } else {
    console.log("SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set — no administrator created");
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
