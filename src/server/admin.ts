import "server-only";
import { z } from "zod";
import type { ChargeStatus, UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { t } from "@/i18n";
import { UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { submitDraftsForUser } from "./job-requests";

// Every function here is called only from admin server actions, which check
// the ADMIN role first. All changes are written to the audit log in the same
// transaction as the change itself.

// ───────────────────────────── Charges ─────────────────────────────

/** Allowed manual charge transitions. Real money movement needs a payment provider (not connected). */
export const CHARGE_TRANSITIONS: Record<ChargeStatus, ChargeStatus[]> = {
  RECORDED: ["WAIVED"],
  INVOICED: ["WAIVED", "PAID"],
  PAID: ["REFUNDED"],
  WAIVED: ["RECORDED"],
  REFUNDED: [],
};

export async function adjustCharge(adminId: string, chargeId: string, toStatus: ChargeStatus, reason: string) {
  if (reason.trim().length < 5) throw new UserError(t("errors.reasonRequired"));
  await db.$transaction(async (tx) => {
    const charge = await tx.platformCharge.findUniqueOrThrow({ where: { id: chargeId } });
    if (!CHARGE_TRANSITIONS[charge.status].includes(toStatus)) throw new UserError(t("errors.invalidTransition"));
    const res = await tx.platformCharge.updateMany({ where: { id: chargeId, status: charge.status }, data: { status: toStatus } });
    if (res.count !== 1) throw new UserError(t("errors.staleState"));
    await tx.chargeAdjustment.create({ data: { chargeId, adminId, fromStatus: charge.status, toStatus, reason } });
    await audit({ actorId: adminId, action: "charge.adjust", entityType: "PlatformCharge", entityId: chargeId, metadata: { from: charge.status, to: toStatus, reason } }, tx);
  });
}

// ───────────────────────────── Categories & areas ─────────────────────────────

const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalidSlug").max(60, "tooLong");

export const categorySchema = z.object({
  id: z.string().max(40).optional().transform((v) => v || undefined),
  nameIs: z.string().trim().min(2, "tooShort").max(80, "tooLong"),
  nameEn: z.string().trim().max(80, "tooLong").transform((v) => v || null),
  slug: slugSchema,
  descriptionIs: z.string().trim().max(300, "tooLong").transform((v) => v || null),
  licenseRelevant: z.enum(["on"]).optional().transform((v) => v === "on"),
  active: z.enum(["on"]).optional().transform((v) => v === "on"),
  sortOrder: z.coerce.number({ invalid_type_error: "invalidNumber" }).int("invalidNumber").min(0).max(1000),
});

export async function saveCategory(adminId: string, input: z.infer<typeof categorySchema>) {
  const clash = await db.category.findFirst({ where: { slug: input.slug, ...(input.id ? { id: { not: input.id } } : {}) } });
  if (clash) throw new UserError(t("errors.slugTaken"), { slug: t("errors.slugTaken") });
  const { id, ...data } = input;
  await db.$transaction(async (tx) => {
    const before = id ? await tx.category.findUnique({ where: { id } }) : null;
    const saved = id ? await tx.category.update({ where: { id }, data }) : await tx.category.create({ data });
    await audit({ actorId: adminId, action: id ? "category.update" : "category.create", entityType: "Category", entityId: saved.id, metadata: { before, after: data } }, tx);
  });
}

export async function setAreaActive(adminId: string, areaId: string, active: boolean) {
  await db.$transaction(async (tx) => {
    await tx.area.update({ where: { id: areaId }, data: { active } });
    await audit({ actorId: adminId, action: active ? "area.activate" : "area.deactivate", entityType: "Area", entityId: areaId }, tx);
  });
}

// ───────────────────────────── Plans & settings ─────────────────────────────

const isk = z.coerce.number({ invalid_type_error: "invalidNumber" }).int("invalidNumber").min(0, "invalidNumber").max(10_000_000, "invalidNumber");

export const pricingSchema = z.object({
  basicPerJobFeeIsk: isk,
  proMonthlyPriceIsk: isk,
  vatRatePercent: z.coerce.number({ invalid_type_error: "invalidNumber" }).int("invalidNumber").min(0, "invalidNumber").max(100, "invalidNumber"),
  pricesIncludeVat: z.enum(["on"]).optional().transform((v) => v === "on"),
  maxInvitesPerRequest: z.coerce.number({ invalid_type_error: "invalidNumber" }).int("invalidNumber").min(1, "invalidNumber").max(10, "invalidNumber"),
});

/**
 * Updates prices and settings. Changes apply to jobs completed from now on;
 * already-recorded charges keep the amount that applied when they were made.
 * `billingEnabled` is intentionally not editable: it requires a configured,
 * approved payment provider (see docs/BILLING.md).
 */
export async function updatePricing(adminId: string, input: z.infer<typeof pricingSchema>) {
  await db.$transaction(async (tx) => {
    const [basic, pro, settings] = await Promise.all([
      tx.plan.findUniqueOrThrow({ where: { code: "BASIC" } }),
      tx.plan.findUniqueOrThrow({ where: { code: "PRO" } }),
      tx.platformSettings.findUniqueOrThrow({ where: { id: 1 } }),
    ]);
    await tx.plan.update({ where: { code: "BASIC" }, data: { perJobFeeIsk: input.basicPerJobFeeIsk } });
    await tx.plan.update({ where: { code: "PRO" }, data: { monthlyPriceIsk: input.proMonthlyPriceIsk } });
    await tx.platformSettings.update({
      where: { id: 1 },
      data: { vatRatePercent: input.vatRatePercent, pricesIncludeVat: input.pricesIncludeVat, maxInvitesPerRequest: input.maxInvitesPerRequest },
    });
    await audit(
      {
        actorId: adminId,
        action: "settings.pricing.update",
        entityType: "PlatformSettings",
        entityId: "1",
        metadata: {
          before: { basicPerJobFeeIsk: basic.perJobFeeIsk, proMonthlyPriceIsk: pro.monthlyPriceIsk, vatRatePercent: settings.vatRatePercent, pricesIncludeVat: settings.pricesIncludeVat, maxInvitesPerRequest: settings.maxInvitesPerRequest },
          after: input,
        },
      },
      tx,
    );
  });
}

// ───────────────────────────── Users ─────────────────────────────

export async function setUserStatus(adminId: string, userId: string, status: Extract<UserStatus, "ACTIVE" | "SUSPENDED">, reason: string) {
  if (adminId === userId) throw new UserError(t("errors.cannotSuspendSelf"));
  if (reason.trim().length < 5) throw new UserError(t("errors.reasonRequired"));
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.status === "DELETED") throw new UserError(t("errors.invalidTransition"));
    await tx.user.update({ where: { id: userId }, data: { status } });
    if (status === "SUSPENDED") await tx.session.deleteMany({ where: { userId } });
    await audit({ actorId: adminId, action: status === "SUSPENDED" ? "user.suspend" : "user.reactivate", entityType: "User", entityId: userId, metadata: { reason } }, tx);
  });
}

/**
 * Confirms a user's e-mail address by hand (e.g. after a phone call), for use
 * while real e-mail delivery is not live. Audited; sends any waiting drafts.
 */
export async function verifyEmailManually(adminId: string, userId: string, reason: string) {
  if (reason.trim().length < 5) throw new UserError(t("errors.reasonRequired"));
  const verified = await db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.status === "DELETED") throw new UserError(t("errors.invalidTransition"));
    if (user.emailVerifiedAt) return false;
    await tx.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    await tx.emailToken.updateMany({ where: { userId, type: "VERIFY_EMAIL", usedAt: null }, data: { usedAt: new Date() } });
    await audit({ actorId: adminId, action: "user.email_verify_manual", entityType: "User", entityId: userId, metadata: { reason } }, tx);
    return true;
  });
  if (verified) await submitDraftsForUser(userId);
}

// ───────────────────────────── Overview ─────────────────────────────

/** Real counts only — nothing here is estimated or padded. */
export async function adminStats() {
  const [pendingProfiles, pendingQualifications, openDisputes, activeBookings, completedBookings, users, recordedFees] = await Promise.all([
    db.tradespersonProfile.count({ where: { status: "PENDING_REVIEW" } }),
    db.qualification.count({ where: { status: "PENDING", profile: { status: { in: ["PENDING_REVIEW", "APPROVED"] } } } }),
    db.dispute.count({ where: { status: "OPEN" } }),
    db.booking.count({ where: { status: { in: ["ACCEPTED", "SCHEDULED", "IN_PROGRESS"] } } }),
    db.booking.count({ where: { status: "COMPLETED" } }),
    db.user.count({ where: { status: { not: "DELETED" } } }),
    db.platformCharge.aggregate({ where: { status: "RECORDED" }, _sum: { amountIsk: true } }),
  ]);
  return { pendingProfiles, pendingQualifications, openDisputes, activeBookings, completedBookings, users, recordedFeesIsk: recordedFees._sum.amountIsk ?? 0 };
}
