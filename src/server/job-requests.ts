import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { t } from "@/i18n";
import { UserError } from "@/lib/action";
import { notify } from "@/lib/notify";
import { parseDateOnly, parseIcelandLocalDateTime, todayInIceland, formatTimeRange } from "@/lib/format";
import { postcodeSchema } from "@/lib/validation";
import { MAX_PHOTOS_PER_REQUEST, removeImage, type StoredImage } from "@/lib/storage";
import { eligibleForRequestWhere } from "./tradespeople";
import { getSettings } from "./settings";
import { hasScheduleConflict } from "./bookings";

// ─────────────────────────────── Create ───────────────────────────────

const dateOnly = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const d = parseDateOnly(v);
    if (!d) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalidDate" });
      return z.NEVER;
    }
    return d;
  });

export const jobRequestSchema = z
  .object({
    categoryId: z.string().min(1, "invalidCategory").max(40),
    areaId: z.string().min(1, "invalidArea").max(40),
    title: z.string().trim().min(5, "titleTooShort").max(120, "tooLong"),
    description: z.string().trim().min(20, "descriptionTooShort").max(5000, "tooLong"),
    addressLine: z.string().trim().min(3, "required").max(150, "tooLong"),
    postcode: postcodeSchema,
    preferredFrom: dateOnly,
    preferredTo: dateOnly,
    urgency: z.enum(["FLEXIBLE", "WITHIN_WEEK", "URGENT"]),
    profileIds: z.array(z.string().max(40)).min(1, "selectTradesperson").max(20),
  })
  .superRefine((v, ctx) => {
    const today = parseDateOnly(todayInIceland())!;
    if (v.preferredFrom && v.preferredFrom < today) ctx.addIssue({ code: "custom", path: ["preferredFrom"], message: "datePast" });
    if (v.preferredFrom && v.preferredTo && v.preferredTo < v.preferredFrom)
      ctx.addIssue({ code: "custom", path: ["preferredTo"], message: "dateRangeOrder" });
  });

export type JobRequestInput = z.infer<typeof jobRequestSchema>;

/**
 * Creates a job request and its invitations. If the customer's e-mail is not
 * verified yet the request is saved as DRAFT and sent on verification.
 * Photos must already be processed and stored; on failure they are removed.
 */
export async function createJobRequest(
  customer: { id: string; emailVerified: boolean },
  input: JobRequestInput,
  photos: StoredImage[],
) {
  try {
    if (photos.length > MAX_PHOTOS_PER_REQUEST) throw new UserError(t("errors.tooManyPhotos", { max: MAX_PHOTOS_PER_REQUEST }));
    const settings = await getSettings();
    const profileIds = [...new Set(input.profileIds)];
    if (profileIds.length > settings.maxInvitesPerRequest) {
      const msg = t("errors.tooManyTradespeople", { max: settings.maxInvitesPerRequest });
      throw new UserError(msg, { profileIds: msg });
    }
    const [category, area] = await Promise.all([
      db.category.findFirst({ where: { id: input.categoryId, active: true } }),
      db.area.findFirst({ where: { id: input.areaId, active: true } }),
    ]);
    if (!category) throw new UserError(t("errors.invalidCategory"), { categoryId: t("errors.invalidCategory") });
    if (!area) throw new UserError(t("errors.invalidArea"), { areaId: t("errors.invalidArea") });

    const eligible = await db.tradespersonProfile.findMany({
      where: { id: { in: profileIds }, ...eligibleForRequestWhere(category.id, area.id) },
      select: { id: true, userId: true },
    });
    if (eligible.length !== profileIds.length) {
      throw new UserError(t("errors.tradespersonUnavailable"), { profileIds: t("errors.tradespersonUnavailable") });
    }

    const submit = customer.emailVerified;
    const request = await db.jobRequest.create({
      data: {
        customerId: customer.id,
        categoryId: category.id,
        areaId: area.id,
        title: input.title,
        description: input.description,
        addressLine: input.addressLine,
        postcode: input.postcode,
        preferredFrom: input.preferredFrom,
        preferredTo: input.preferredTo,
        urgency: input.urgency,
        status: submit ? "SUBMITTED" : "DRAFT",
        submittedAt: submit ? new Date() : null,
        invitations: { create: eligible.map((p) => ({ profileId: p.id })) },
        photos: { create: photos.map((p) => ({ ...p, ownerId: customer.id })) },
      },
    });
    if (submit) await notifyInvitees(request.id);
    return request;
  } catch (err) {
    await Promise.all(photos.map((p) => removeImage(p.storageKey)));
    throw err;
  }
}

async function notifyInvitees(jobRequestId: string) {
  const request = await db.jobRequest.findUniqueOrThrow({
    where: { id: jobRequestId },
    include: { area: true, invitations: { include: { profile: { select: { userId: true } } } } },
  });
  await Promise.all(
    request.invitations.map((inv) =>
      notify(inv.profile.userId, {
        type: "new_request",
        title: t("notifications.newRequestTitle", { title: request.title }),
        body: t("notifications.newRequestBody", { area: request.area.name }),
        href: `/fagadili/beidnir/${inv.id}`,
      }),
    ),
  );
}

/** Sends DRAFT requests after e-mail verification. Returns how many were sent. */
export async function submitDraftsForUser(userId: string): Promise<number> {
  const drafts = await db.jobRequest.findMany({
    where: { customerId: userId, status: "DRAFT" },
    include: { invitations: true },
  });
  let sent = 0;
  for (const draft of drafts) {
    // Re-check that invitees are still eligible; drop any that are not.
    const stillEligible = await db.tradespersonProfile.findMany({
      where: { id: { in: draft.invitations.map((i) => i.profileId) }, ...eligibleForRequestWhere(draft.categoryId, draft.areaId) },
      select: { id: true },
    });
    const keep = new Set(stillEligible.map((p) => p.id));
    if (keep.size === 0) continue; // stays a draft; the customer can pick again
    await db.$transaction([
      db.jobInvitation.deleteMany({ where: { jobRequestId: draft.id, profileId: { notIn: [...keep] } } }),
      db.jobRequest.updateMany({ where: { id: draft.id, status: "DRAFT" }, data: { status: "SUBMITTED", submittedAt: new Date() } }),
    ]);
    await notifyInvitees(draft.id);
    sent++;
  }
  return sent;
}

// ─────────────────────────────── Read ─────────────────────────────────

export async function getRequestForCustomer(id: string, customerId: string) {
  return db.jobRequest.findFirst({
    where: { id, customerId },
    include: {
      category: true,
      area: true,
      photos: { orderBy: { createdAt: "asc" } },
      booking: { select: { id: true, status: true } },
      invitations: {
        orderBy: { createdAt: "asc" },
        include: { profile: { select: { id: true, slug: true, businessName: true, publicPhone: true } } },
      },
    },
  });
}

export async function listRequestsForCustomer(customerId: string) {
  return db.jobRequest.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      category: true,
      area: true,
      booking: { select: { id: true, status: true } },
      invitations: { select: { status: true } },
    },
  });
}

/**
 * The tradesperson's view of an invitation. The exact street address is
 * withheld until the customer books this tradesperson.
 */
export async function getInvitationForPro(invitationId: string, profileId: string) {
  const inv = await db.jobInvitation.findFirst({
    where: { id: invitationId, profileId },
    include: {
      booking: { select: { id: true } },
      jobRequest: {
        include: {
          category: true,
          area: true,
          photos: { orderBy: { createdAt: "asc" } },
          customer: { select: { name: true } },
        },
      },
    },
  });
  if (!inv) return null;
  const { addressLine: _hidden, ...request } = inv.jobRequest;
  void _hidden;
  // First name only until booked.
  const customerFirstName = request.customer.name.split(" ")[0];
  return { ...inv, jobRequest: { ...request, customer: { name: customerFirstName } } };
}

export async function markInvitationSeen(invitationId: string, profileId: string) {
  await db.jobInvitation.updateMany({ where: { id: invitationId, profileId, seenAt: null }, data: { seenAt: new Date() } });
}

export async function listInvitationsForPro(profileId: string, statuses?: Prisma.EnumInvitationStatusFilter["in"]) {
  return db.jobInvitation.findMany({
    where: { profileId, ...(statuses ? { status: { in: statuses } } : {}), jobRequest: { status: { not: "DRAFT" } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { jobRequest: { include: { category: true, area: true } } },
  });
}

// ─────────────────────────────── Respond ──────────────────────────────

const amountSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v.replace(/[.\s]/g, "").replace(/kr\.?$/i, ""));
    if (!Number.isInteger(n) || n < 0 || n > 100_000_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalidPrice" });
      return z.NEVER;
    }
    return n;
  });

const localDateTime = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const d = parseIcelandLocalDateTime(v);
    if (!d) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalidDate" });
      return z.NEVER;
    }
    return d;
  });

export const timeRangeShape = { start: localDateTime, end: localDateTime };

export function refineTimeRange(
  v: { start: Date | null; end: Date | null },
  ctx: z.RefinementCtx,
  opts: { required: boolean },
) {
  if ((v.start === null) !== (v.end === null) || (opts.required && !v.start)) {
    ctx.addIssue({ code: "custom", path: [v.start ? "end" : "start"], message: "timeIncomplete" });
    return;
  }
  if (v.start && v.end) {
    if (v.end <= v.start) ctx.addIssue({ code: "custom", path: ["end"], message: "endBeforeStart" });
    if (v.start.getTime() < Date.now() - 5 * 60_000) ctx.addIssue({ code: "custom", path: ["start"], message: "startInPast" });
    if (v.end.getTime() - v.start.getTime() > 60 * 86400_000) ctx.addIssue({ code: "custom", path: ["end"], message: "invalidDate" });
  }
}

export const acceptInvitationSchema = z
  .object({
    priceType: z.enum(["FIXED", "ESTIMATE", "HOURLY", "INSPECTION"], { errorMap: () => ({ message: "invalidPriceType" }) }),
    priceAmountIsk: amountSchema,
    priceNote: z.string().trim().max(500, "tooLong").transform((v) => v || null),
    message: z.string().trim().max(2000, "tooLong").transform((v) => v || null),
    ...timeRangeShape,
  })
  .superRefine((v, ctx) => {
    if (v.priceType !== "INSPECTION" && v.priceAmountIsk === null)
      ctx.addIssue({ code: "custom", path: ["priceAmountIsk"], message: "priceRequired" });
    refineTimeRange(v, ctx, { required: false });
  });

export async function acceptInvitation(profileId: string, invitationId: string, input: z.infer<typeof acceptInvitationSchema>) {
  const inv = await db.jobInvitation.findFirst({
    where: { id: invitationId, profileId },
    include: { jobRequest: true, profile: true },
  });
  if (!inv) throw new UserError(t("errors.forbidden"));
  if (inv.jobRequest.status !== "SUBMITTED") throw new UserError(t("errors.requestClosed"));
  if (input.start && input.end && (await hasScheduleConflict(profileId, input.start, input.end))) {
    throw new UserError(t("errors.timeConflict"), { start: t("errors.timeConflict") });
  }
  // Conditional update: only a PENDING invitation can be answered, exactly once.
  const res = await db.jobInvitation.updateMany({
    where: { id: invitationId, profileId, status: "PENDING", jobRequest: { status: "SUBMITTED" } },
    data: {
      status: "ACCEPTED",
      priceType: input.priceType,
      priceAmountIsk: input.priceType === "INSPECTION" ? null : input.priceAmountIsk,
      priceNote: input.priceNote,
      message: input.message,
      proposedStart: input.start,
      proposedEnd: input.end,
      respondedAt: new Date(),
    },
  });
  if (res.count !== 1) throw new UserError(t("errors.alreadyResponded"));
  await notify(inv.jobRequest.customerId, {
    type: "invitation_accepted",
    title: t("notifications.responseTitle", { name: inv.profile.businessName }),
    body: t("notifications.responseBody"),
    href: `/minar-sidur/beidnir/${inv.jobRequestId}`,
  });
}

export async function declineInvitation(profileId: string, invitationId: string, reason: string | null) {
  const inv = await db.jobInvitation.findFirst({ where: { id: invitationId, profileId }, include: { jobRequest: true, profile: true } });
  if (!inv) throw new UserError(t("errors.forbidden"));
  const res = await db.jobInvitation.updateMany({
    where: { id: invitationId, profileId, status: "PENDING" },
    data: { status: "DECLINED", declineReason: reason?.trim().slice(0, 500) || null, respondedAt: new Date() },
  });
  if (res.count !== 1) throw new UserError(t("errors.alreadyResponded"));
  if (inv.jobRequest.status === "SUBMITTED") {
    await notify(inv.jobRequest.customerId, {
      type: "invitation_declined",
      title: t("notifications.declinedTitle", { name: inv.profile.businessName }),
      body: t("notifications.declinedBody"),
      href: `/minar-sidur/beidnir/${inv.jobRequestId}`,
    });
  }
}

// ─────────────────────────── Customer decisions ───────────────────────

/**
 * Customer confirms one accepted response → creates the booking. Price and
 * time are copied server-side from the tradesperson's response; nothing from
 * the client is trusted. Guarded so a request can only be booked once.
 */
export async function confirmBooking(customerId: string, invitationId: string) {
  const inv = await db.jobInvitation.findFirst({
    where: { id: invitationId, jobRequest: { customerId } },
    include: { jobRequest: true, profile: true },
  });
  if (!inv) throw new UserError(t("errors.forbidden"));
  if (inv.status !== "ACCEPTED" || inv.jobRequest.status !== "SUBMITTED" || !inv.priceType) {
    throw new UserError(t("errors.requestClosed"));
  }

  // If the proposed slot was taken meanwhile, book without a time; the
  // tradesperson then sets a new one. The DB exclusion constraint is the
  // final guard against races.
  let start = inv.proposedStart;
  let end = inv.proposedEnd;
  if (start && end && (start.getTime() < Date.now() || (await hasScheduleConflict(inv.profileId, start, end)))) {
    start = null;
    end = null;
  }

  const booking = await db.$transaction(async (tx) => {
    const claimed = await tx.jobRequest.updateMany({
      where: { id: inv.jobRequestId, customerId, status: "SUBMITTED" },
      data: { status: "BOOKED" },
    });
    if (claimed.count !== 1) throw new UserError(t("errors.requestClosed"));
    await tx.jobInvitation.update({ where: { id: inv.id }, data: { status: "SELECTED" } });
    await tx.jobInvitation.updateMany({
      where: { jobRequestId: inv.jobRequestId, id: { not: inv.id }, status: { in: ["PENDING", "ACCEPTED"] } },
      data: { status: "NOT_SELECTED" },
    });
    const status = start && end ? "SCHEDULED" : "ACCEPTED";
    const b = await tx.booking.create({
      data: {
        jobRequestId: inv.jobRequestId,
        invitationId: inv.id,
        customerId,
        profileId: inv.profileId,
        source: "PLATFORM",
        status,
        priceType: inv.priceType!,
        priceAmountIsk: inv.priceAmountIsk,
        priceNote: inv.priceNote,
        scheduledStart: start,
        scheduledEnd: end,
      },
    });
    await tx.bookingEvent.create({ data: { bookingId: b.id, actorId: customerId, toStatus: "ACCEPTED", type: "created" } });
    if (status === "SCHEDULED") {
      await tx.bookingEvent.create({
        data: { bookingId: b.id, actorId: customerId, fromStatus: "ACCEPTED", toStatus: "SCHEDULED", type: "scheduled" },
      });
    }
    return b;
  });

  await notify(inv.profile.userId, {
    type: "booking_created",
    title: t("notifications.bookedTitle", { title: inv.jobRequest.title }),
    body: booking.scheduledStart && booking.scheduledEnd ? formatTimeRange(booking.scheduledStart, booking.scheduledEnd) : t("notifications.bookedBody"),
    href: `/bokanir/${booking.id}`,
  });
  await notifyNotSelected(inv.jobRequestId, inv.id, inv.jobRequest.title);
  return booking;
}

async function notifyNotSelected(jobRequestId: string, exceptInvitationId: string | null, title: string) {
  const others = await db.jobInvitation.findMany({
    where: { jobRequestId, status: "NOT_SELECTED", ...(exceptInvitationId ? { id: { not: exceptInvitationId } } : {}) },
    include: { profile: { select: { userId: true } } },
  });
  await Promise.all(
    others.map((o) =>
      notify(o.profile.userId, {
        type: "invitation_not_selected",
        title: t("notifications.notSelectedTitle", { title }),
        body: t("notifications.notSelectedBody"),
        href: `/fagadili/beidnir/${o.id}`,
      }),
    ),
  );
}

export async function cancelJobRequest(customerId: string, jobRequestId: string) {
  const request = await db.jobRequest.findFirst({ where: { id: jobRequestId, customerId } });
  if (!request) throw new UserError(t("errors.forbidden"));
  const wasSubmitted = request.status === "SUBMITTED";
  await db.$transaction(async (tx) => {
    const res = await tx.jobRequest.updateMany({
      where: { id: jobRequestId, customerId, status: { in: ["DRAFT", "SUBMITTED"] } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (res.count !== 1) throw new UserError(t("errors.requestClosed"));
    await tx.jobInvitation.updateMany({
      where: { jobRequestId, status: { in: ["PENDING", "ACCEPTED"] } },
      data: { status: "NOT_SELECTED" },
    });
  });
  if (wasSubmitted) await notifyNotSelected(jobRequestId, null, request.title);
}
