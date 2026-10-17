import { PrismaClient, type PlanCode } from "@prisma/client";
import { areas, categories, plans } from "../../prisma/reference-data";
import { hashPassword } from "../../src/lib/auth/password";

export const db = new PrismaClient();

const TABLES = [
  "messages", "charge_adjustments", "platform_charges", "disputes", "booking_events", "bookings", "uploads",
  "job_invitations", "job_requests", "qualifications", "subscriptions", "tradesperson_areas", "tradesperson_categories",
  "tradesperson_profiles", "notifications", "email_outbox", "audit_logs", "email_tokens", "sessions", "rate_limits",
  "users", "plans", "platform_settings", "categories", "areas",
];

/** Wipes the TEST database and re-seeds reference data. Never point this at a real database. */
export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("_test")) throw new Error("Refusing to reset a non-test database");
  await db.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
  for (const [i, c] of categories.entries()) await db.category.create({ data: { ...c, sortOrder: i } });
  for (const [i, a] of areas.entries()) await db.area.create({ data: { ...a, sortOrder: i } });
  for (const p of plans) await db.plan.create({ data: p });
  await db.platformSettings.create({ data: { id: 1 } });
}

let n = 0;
let cachedHash: string | undefined;
async function pw() {
  cachedHash ??= await hashPassword("password-1234");
  return cachedHash;
}

export async function makeCustomer(opts: { verified?: boolean } = {}) {
  const i = ++n;
  return db.user.create({
    data: {
      email: `customer${i}-${Date.now()}@test.is`,
      name: `Viðskiptavinur ${i}`,
      phone: "6123456",
      passwordHash: await pw(),
      emailVerifiedAt: opts.verified === false ? null : new Date(),
    },
  });
}

export async function makePro(opts: { plan?: PlanCode; accepting?: boolean; status?: "APPROVED" | "PENDING_REVIEW"; categorySlug?: string; areaSlug?: string } = {}) {
  const i = ++n;
  const category = await db.category.findUniqueOrThrow({ where: { slug: opts.categorySlug ?? "pipari" } });
  const area = await db.area.findUniqueOrThrow({ where: { slug: opts.areaSlug ?? "reykjavik" } });
  const user = await db.user.create({
    data: {
      email: `pro${i}-${Date.now()}@test.is`,
      name: `Fagaðili ${i}`,
      role: "TRADESPERSON",
      passwordHash: await pw(),
      emailVerifiedAt: new Date(),
      tradesperson: {
        create: {
          slug: `fagadili-${i}-${Date.now()}`,
          businessName: `Pípulagnir ${i} ehf.`,
          description: "Reynslumikill pípari sem tekur að sér öll smærri og stærri verk.",
          status: opts.status ?? "APPROVED",
          acceptingRequests: opts.accepting ?? true,
          subscription: { create: { planCode: opts.plan ?? "BASIC" } },
          categories: { create: { categoryId: category.id } },
          areas: { create: { areaId: area.id } },
        },
      },
    },
    include: { tradesperson: true },
  });
  return { user, profile: user.tradesperson!, category, area };
}

export function requestInput(categoryId: string, areaId: string, profileIds: string[]) {
  return {
    categoryId,
    areaId,
    title: "Leki undir vaski",
    description: "Það lekur undir eldhúsvaskinum og skápurinn er orðinn blautur.",
    addressLine: "Laugavegur 1",
    postcode: "101",
    preferredFrom: null,
    preferredTo: null,
    urgency: "WITHIN_WEEK" as const,
    profileIds,
  };
}

export function hoursFromNow(h: number) {
  const d = new Date(Date.now() + h * 3600_000);
  d.setUTCMinutes(0, 0, 0);
  return d;
}
