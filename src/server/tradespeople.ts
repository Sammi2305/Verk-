import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma, TradespersonProfile } from "@prisma/client";
import { db } from "@/lib/db";
import { t } from "@/i18n";
import { UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { notify, notifyAdmins } from "@/lib/notify";
import { optionalPhoneSchema } from "@/lib/validation";

// ───────────────────────────── Visibility ─────────────────────────────

/** A profile is publicly visible only when approved and its user is active. */
export const publicProfileWhere: Prisma.TradespersonProfileWhereInput = {
  status: "APPROVED",
  user: { status: "ACTIVE" },
};

/** Profiles that may receive new job requests in a category and area. */
export function eligibleForRequestWhere(categoryId: string, areaId: string): Prisma.TradespersonProfileWhereInput {
  return {
    ...publicProfileWhere,
    acceptingRequests: true,
    user: { status: "ACTIVE", emailVerifiedAt: { not: null } },
    categories: { some: { categoryId } },
    areas: { some: { areaId } },
  };
}

const cardInclude = {
  categories: { include: { category: true } },
  areas: { include: { area: true } },
  qualifications: { where: { status: "VERIFIED" as const }, include: { category: true } },
} satisfies Prisma.TradespersonProfileInclude;

export type ProfileCard = Prisma.TradespersonProfileGetPayload<{ include: typeof cardInclude }>;

// ─────────────────────────────── Search ───────────────────────────────

export type SearchParams = {
  category?: string; // slug
  area?: string; // slug
  q?: string;
  acceptingOnly?: boolean;
  verifiedOnly?: boolean;
  page?: number;
};

export const PAGE_SIZE = 20;

/**
 * Relevance score. Deliberately excludes the subscription plan: paying for
 * Pro must never improve organic ranking. When genuine reviews exist they will
 * be added here as "verified service quality".
 */
export function relevanceScore(p: ProfileCard, categoryId: string | undefined, q: string | undefined): number {
  let score = 0;
  const verified = p.qualifications.filter((x) => !categoryId || x.categoryId === null || x.categoryId === categoryId);
  if (verified.length > 0) score += 3;
  if (p.acceptingRequests) score += 2;
  if (q) {
    const needle = q.toLowerCase();
    if (p.businessName.toLowerCase().includes(needle)) score += 2;
    if (p.description.toLowerCase().includes(needle)) score += 1;
  }
  return score;
}

/**
 * Tie-break that rotates daily, so equally relevant profiles share the top
 * spots fairly instead of favouring the earliest sign-ups.
 */
export function dailyTieBreak(id: string, day = new Date().toISOString().slice(0, 10)): string {
  return createHash("sha256").update(`${day}:${id}`).digest("hex");
}

export async function searchTradespeople(params: SearchParams) {
  const [category, area] = await Promise.all([
    params.category ? db.category.findFirst({ where: { slug: params.category, active: true } }) : null,
    params.area ? db.area.findFirst({ where: { slug: params.area, active: true } }) : null,
  ]);
  const q = params.q?.trim().slice(0, 80) || undefined;

  const where: Prisma.TradespersonProfileWhereInput = {
    ...publicProfileWhere,
    ...(category ? { categories: { some: { categoryId: category.id } } } : {}),
    ...(area ? { areas: { some: { areaId: area.id } } } : {}),
    ...(params.acceptingOnly ? { acceptingRequests: true } : {}),
    ...(params.verifiedOnly
      ? {
          qualifications: {
            some: { status: "VERIFIED", ...(category ? { OR: [{ categoryId: category.id }, { categoryId: null }] } : {}) },
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { businessName: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { categories: { some: { category: { nameIs: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  };

  // Candidate sets are small at launch scale; ranking happens in memory.
  // Move scoring into SQL once a single query can match thousands of profiles.
  const rows = await db.tradespersonProfile.findMany({ where, include: cardInclude, take: 500 });
  const ranked = rows
    .map((p) => ({ p, score: relevanceScore(p, category?.id, q), tie: dailyTieBreak(p.id) }))
    .sort((a, b) => b.score - a.score || a.tie.localeCompare(b.tie))
    .map((x) => x.p);

  const page = Math.max(1, Math.min(params.page ?? 1, 100));
  return {
    category,
    area,
    total: ranked.length,
    page,
    pageCount: Math.max(1, Math.ceil(ranked.length / PAGE_SIZE)),
    results: ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

export async function listEligibleForRequest(categoryId: string, areaId: string) {
  const rows = await db.tradespersonProfile.findMany({
    where: eligibleForRequestWhere(categoryId, areaId),
    include: cardInclude,
    take: 200,
  });
  return rows
    .map((p) => ({ p, score: relevanceScore(p, categoryId, undefined), tie: dailyTieBreak(p.id) }))
    .sort((a, b) => b.score - a.score || a.tie.localeCompare(b.tie))
    .map((x) => x.p);
}

// ─────────────────────────────── Profiles ──────────────────────────────

export async function getPublicProfile(slug: string) {
  return db.tradespersonProfile.findFirst({ where: { slug, ...publicProfileWhere }, include: cardInclude });
}

/** The owner can preview their own profile before approval. */
export async function getProfileForPreview(slug: string, viewerUserId: string | undefined) {
  const profile = await db.tradespersonProfile.findUnique({ where: { slug }, include: cardInclude });
  if (!profile) return null;
  if (profile.status === "APPROVED") return (await getPublicProfile(slug)) ? profile : null;
  return viewerUserId && profile.userId === viewerUserId ? profile : null;
}

export const profileSchema = z.object({
  businessName: z.string().trim().min(2, "nameTooShort").max(100, "tooLong"),
  description: z.string().trim().max(3000, "tooLong"),
  publicPhone: optionalPhoneSchema,
  yearsExperience: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 70) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalidNumber" });
        return z.NEVER;
      }
      return n;
    }),
  categoryIds: z.array(z.string().max(40)).max(20),
  areaIds: z.array(z.string().max(40)).max(50),
});

export async function updateProfile(profile: TradespersonProfile, input: z.infer<typeof profileSchema>) {
  const [cats, areas] = await Promise.all([
    db.category.findMany({ where: { id: { in: input.categoryIds }, active: true }, select: { id: true } }),
    db.area.findMany({ where: { id: { in: input.areaIds }, active: true }, select: { id: true } }),
  ]);
  await db.$transaction([
    db.tradespersonProfile.update({
      where: { id: profile.id },
      data: {
        businessName: input.businessName,
        description: input.description,
        publicPhone: input.publicPhone,
        yearsExperience: input.yearsExperience,
      },
    }),
    db.tradespersonCategory.deleteMany({ where: { profileId: profile.id } }),
    db.tradespersonCategory.createMany({ data: cats.map((c) => ({ profileId: profile.id, categoryId: c.id })) }),
    db.tradespersonArea.deleteMany({ where: { profileId: profile.id } }),
    db.tradespersonArea.createMany({ data: areas.map((a) => ({ profileId: profile.id, areaId: a.id })) }),
  ]);
}

export async function submitProfileForReview(profileId: string) {
  const profile = await db.tradespersonProfile.findUniqueOrThrow({
    where: { id: profileId },
    include: { _count: { select: { categories: true, areas: true } } },
  });
  if (profile.status !== "DRAFT" && profile.status !== "REJECTED") return;
  if (profile.description.trim().length < 20 || profile._count.categories === 0 || profile._count.areas === 0) {
    throw new UserError(t("errors.profileIncomplete"));
  }
  const res = await db.tradespersonProfile.updateMany({
    where: { id: profileId, status: { in: ["DRAFT", "REJECTED"] } },
    data: { status: "PENDING_REVIEW", submittedAt: new Date() },
  });
  if (res.count === 1) {
    await notifyAdmins({
      type: "profile_submitted",
      title: t("notifications.profileSubmittedTitle", { name: profile.businessName }),
      href: `/stjornbord/fagadilar/${profileId}`,
    });
  }
}

export async function setAcceptingRequests(profileId: string, accepting: boolean) {
  await db.tradespersonProfile.update({ where: { id: profileId }, data: { acceptingRequests: accepting } });
}

export const qualificationSchema = z.object({
  type: z.enum(["JOURNEYMAN", "MASTER", "LICENSE", "INSURANCE", "OTHER"]),
  title: z.string().trim().min(3, "tooShort").max(150, "tooLong"),
  issuer: z.string().trim().max(150, "tooLong").transform((v) => v || null),
  referenceNo: z.string().trim().max(80, "tooLong").transform((v) => v || null),
  categoryId: z.string().trim().max(40).transform((v) => v || null),
});

export async function addQualification(profileId: string, input: z.infer<typeof qualificationSchema>) {
  const count = await db.qualification.count({ where: { profileId } });
  if (count >= 20) throw new UserError(t("errors.tooLong"));
  const categoryId = input.categoryId
    ? ((await db.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }))?.id ?? null)
    : null;
  await db.qualification.create({ data: { ...input, categoryId, profileId, status: "PENDING" } });
}

/** Tradespeople may remove only qualifications that have not been verified. */
export async function removeQualification(profileId: string, qualificationId: string) {
  await db.qualification.deleteMany({ where: { id: qualificationId, profileId, status: { not: "VERIFIED" } } });
}

// ─────────────────────────────── Admin ─────────────────────────────────

export async function reviewProfile(
  adminId: string,
  profileId: string,
  decision: "APPROVED" | "REJECTED" | "SUSPENDED",
  note: string | null,
) {
  const profile = await db.tradespersonProfile.findUniqueOrThrow({ where: { id: profileId }, include: { user: true } });
  if (decision === "APPROVED" && !profile.user.emailVerifiedAt) throw new UserError(t("admin.cannotApproveUnverified"));
  if (decision !== "APPROVED" && (!note || note.trim().length < 5)) throw new UserError(t("errors.reasonRequired"));
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.tradespersonProfile.update({
      where: { id: profileId },
      data: {
        status: decision,
        reviewNote: note,
        reviewedAt: now,
        reviewedById: adminId,
        ...(decision === "APPROVED" && !profile.approvedAt ? { approvedAt: now } : {}),
      },
    });
    await audit(
      { actorId: adminId, action: `profile.${decision.toLowerCase()}`, entityType: "TradespersonProfile", entityId: profileId, metadata: { note, from: profile.status } },
      tx,
    );
  });
  if (decision === "APPROVED") {
    await notify(profile.userId, { type: "profile_approved", title: t("notifications.profileApprovedTitle"), body: t("notifications.profileApprovedBody"), href: "/fagadili" });
  } else if (decision === "REJECTED") {
    await notify(profile.userId, { type: "profile_rejected", title: t("notifications.profileRejectedTitle"), body: note ?? "", href: "/fagadili/profill" });
  }
}

export async function reviewQualification(adminId: string, qualificationId: string, decision: "VERIFIED" | "REJECTED", note: string | null) {
  if (!note || note.trim().length < 5) throw new UserError(t("errors.reasonRequired"));
  await db.$transaction(async (tx) => {
    const q = await tx.qualification.update({
      where: { id: qualificationId },
      data: { status: decision, verifiedAt: decision === "VERIFIED" ? new Date() : null, verifiedById: adminId, adminNote: note },
    });
    await audit(
      { actorId: adminId, action: `qualification.${decision.toLowerCase()}`, entityType: "Qualification", entityId: q.id, metadata: { note, profileId: q.profileId } },
      tx,
    );
  });
}
