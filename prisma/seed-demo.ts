// DEVELOPMENT ONLY: creates clearly labelled demo accounts so the app can be
// clicked through locally. Refuses to run in production or against a
// non-local database. Every demo name is marked "(prófun)".
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const db = new PrismaClient();
const PASSWORD = "profun-1234";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.NODE_ENV === "production" || !/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    throw new Error("seed-demo only runs against a local development database");
  }
  const hash = await hashPassword(PASSWORD);
  const cat = (slug: string) => db.category.findUniqueOrThrow({ where: { slug } });
  const area = (slug: string) => db.area.findUniqueOrThrow({ where: { slug } });

  const pros = [
    { email: "pipari@demo.local", name: "Demo Pípari", business: "Pípulagnir Demo (prófun)", cats: ["pipari"], areas: ["reykjavik", "kopavogur"], verified: true },
    { email: "rafvirki@demo.local", name: "Demo Rafvirki", business: "Rafverk Demo (prófun)", cats: ["rafvirki"], areas: ["reykjavik", "hafnarfjordur", "gardabaer"], verified: false },
    { email: "smidur@demo.local", name: "Demo Smiður", business: "Smíðaverk Demo (prófun)", cats: ["smidur", "heimilisvidhald"], areas: ["reykjavik"], verified: true },
  ];
  for (const p of pros) {
    if (await db.user.findUnique({ where: { email: p.email } })) continue;
    const categories = await Promise.all(p.cats.map(cat));
    const areas = await Promise.all(p.areas.map(area));
    await db.user.create({
      data: {
        email: p.email,
        name: p.name,
        role: "TRADESPERSON",
        passwordHash: hash,
        emailVerifiedAt: new Date(),
        tradesperson: {
          create: {
            slug: p.business.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-+$/, ""),
            businessName: p.business,
            description: "Prófunaraðgangur til að skoða kerfið í þróun. Þetta er ekki raunverulegt fyrirtæki.",
            status: "APPROVED",
            approvedAt: new Date(),
            subscription: { create: { planCode: "BASIC" } },
            categories: { create: categories.map((c) => ({ categoryId: c.id })) },
            areas: { create: areas.map((a) => ({ areaId: a.id })) },
            qualifications: p.verified
              ? { create: { type: "JOURNEYMAN", title: "Sveinsbréf (prófun)", categoryId: categories[0].id, status: "VERIFIED", verifiedAt: new Date(), adminNote: "Prófunargögn" } }
              : undefined,
          },
        },
      },
    });
  }
  if (!(await db.user.findUnique({ where: { email: "vidskiptavinur@demo.local" } }))) {
    await db.user.create({ data: { email: "vidskiptavinur@demo.local", name: "Demo Viðskiptavinur", passwordHash: hash, emailVerifiedAt: new Date(), phone: "6123456" } });
  }
  console.log(`Demo data ready. Password for all demo accounts: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
