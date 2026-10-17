import "server-only";
import { z } from "zod";
import { Prisma, type Booking, type BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { t } from "@/i18n";
import { UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { notify, notifyAdmins } from "@/lib/notify";
import { formatTimeRange } from "@/lib/format";
import { getSettings } from "./settings";
import { decideFee } from "./fees";

// ───────────────────────────── Access control ──────────────────────────

export type BookingViewer = { id: string; role: "CUSTOMER" | "TRADESPERSON" | "ADMIN" };
export type BookingParty = "customer" | "pro" | "admin";

const bookingInclude = {
  jobRequest: { include: { category: true, area: true, photos: { orderBy: { createdAt: "asc" as const } } } },
  customer: { select: { id: true, name: true, email: true, phone: true, status: true } },
  profile: { select: { id: true, slug: true, businessName: true, publicPhone: true, userId: true, user: { select: { email: true, phone: true } } } },
  events: { orderBy: { createdAt: "asc" as const }, include: { actor: { select: { name: true } } } },
  disputes: { orderBy: { createdAt: "desc" as const } },
  charge: true,
  messages: { orderBy: { createdAt: "asc" as const }, take: 200, include: { sender: { select: { id: true, name: true } } } },
} satisfies Prisma.BookingInclude;

export type BookingDetail = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

/** Returns the booking and the viewer's role in it, or null if they may not see it. */
export async function getBookingForViewer(bookingId: string, viewer: BookingViewer) {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });
  if (!booking) return null;
  let party: BookingParty | null = null;
  if (viewer.role === "ADMIN") party = "admin";
  else if (booking.customerId === viewer.id) party = "customer";
  else if (booking.profile.userId === viewer.id) party = "pro";
  return party ? { booking, party } : null;
}

export async function listBookingsForCustomer(customerId: string) {
  return db.booking.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { jobRequest: { select: { title: true } }, profile: { select: { businessName: true } } },
  });
}

export async function listBookingsForPro(profileId: string, statuses?: BookingStatus[]) {
  return db.booking.findMany({
    where: { profileId, ...(statuses ? { status: { in: statuses } } : {}) },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { jobRequest: { select: { title: true, area: { select: { name: true } } } }, customer: { select: { name: true } } },
  });
}

// ───────────────────────────── Scheduling ──────────────────────────────

/** True if the tradesperson already has an active booking overlapping [start, end). */
export async function hasScheduleConflict(profileId: string, start: Date, end: Date, excludeBookingId?: string) {
  const clash = await db.booking.findFirst({
    where: {
      profileId,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      scheduledStart: { lt: end },
      scheduledEnd: { gt: start },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { id: true },
  });
  return clash !== null;
}

function isOverlapViolation(err: unknown) {
  return (
    (err instanceof Prisma.PrismaClientKnownRequestError && /booking_no_overlap/.test(String(err.meta?.message ?? err.message))) ||
    (err instanceof Prisma.PrismaClientUnknownRequestError && /booking_no_overlap/.test(err.message)) ||
    (err instanceof Error && /booking_no_overlap/.test(err.message))
  );
}

// ───────────────────────────── Transitions ─────────────────────────────

type Tx = Prisma.TransactionClient;

/**
 * Applies a transition atomically: the update only succeeds if the booking is
 * still in one of `from` and at the version the caller saw. This makes every
 * action idempotent and race-safe (double clicks, two tabs, two parties).
 */
async function transition(
  tx: Tx,
  booking: Booking,
  opts: { from: BookingStatus[]; to: BookingStatus; actorId: string | null; type: string; note?: string; data?: Prisma.BookingUpdateManyMutationInput },
) {
  if (!opts.from.includes(booking.status)) throw new UserError(t("errors.invalidTransition"));
  const res = await tx.booking.updateMany({
    where: { id: booking.id, status: booking.status, version: booking.version },
    data: { ...opts.data, status: opts.to, version: { increment: 1 } },
  });
  if (res.count !== 1) throw new UserError(t("errors.staleState"));
  await tx.bookingEvent.create({
    data: { bookingId: booking.id, actorId: opts.actorId, fromStatus: booking.status, toStatus: opts.to, type: opts.type, note: opts.note },
  });
}

async function loadForParty(bookingId: string, userId: string, party: "customer" | "pro") {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { profile: { select: { userId: true, businessName: true } }, customer: { select: { name: true } }, jobRequest: { select: { title: true } } },
  });
  if (!booking) throw new UserError(t("errors.forbidden"));
  const allowed = party === "customer" ? booking.customerId === userId : booking.profile.userId === userId;
  if (!allowed) throw new UserError(t("errors.forbidden"));
  return booking;
}

function titleOf(b: { jobRequest: { title: string } | null }) {
  return b.jobRequest?.title ?? t("booking.title");
}

export const scheduleSchema = z.object({ start: z.date(), end: z.date() });

export async function scheduleBooking(userId: string, bookingId: string, start: Date, end: Date) {
  const b = await loadForParty(bookingId, userId, "pro");
  if (await hasScheduleConflict(b.profileId, start, end, b.id)) throw new UserError(t("errors.timeConflict"), { start: t("errors.timeConflict") });
  try {
    await db.$transaction((tx) =>
      transition(tx, b, {
        from: ["ACCEPTED", "SCHEDULED"],
        to: "SCHEDULED",
        actorId: userId,
        type: "scheduled",
        note: formatTimeRange(start, end),
        data: { scheduledStart: start, scheduledEnd: end },
      }),
    );
  } catch (err) {
    if (isOverlapViolation(err)) throw new UserError(t("errors.timeConflict"), { start: t("errors.timeConflict") });
    throw err;
  }
  await notify(b.customerId, {
    type: "booking_scheduled",
    title: t("notifications.scheduledTitle", { title: titleOf(b) }),
    body: t("notifications.scheduledBody", { time: formatTimeRange(start, end) }),
    href: `/bokanir/${b.id}`,
  });
}

export async function startBooking(userId: string, bookingId: string) {
  const b = await loadForParty(bookingId, userId, "pro");
  await db.$transaction((tx) => transition(tx, b, { from: ["SCHEDULED"], to: "IN_PROGRESS", actorId: userId, type: "started" }));
  await notify(b.customerId, { type: "booking_started", title: t("notifications.startedTitle", { title: titleOf(b) }), href: `/bokanir/${b.id}` });
}

/** Tradesperson reports the job done. It is NOT completed (or billable) until the customer confirms. */
export async function reportCompletion(userId: string, bookingId: string) {
  const b = await loadForParty(bookingId, userId, "pro");
  if (b.completionReportedAt) throw new UserError(t("errors.invalidTransition"));
  await db.$transaction((tx) =>
    transition(tx, b, {
      from: ["SCHEDULED", "IN_PROGRESS"],
      to: "IN_PROGRESS",
      actorId: userId,
      type: "completion_reported",
      data: { completionReportedAt: new Date() },
    }),
  );
  await notify(b.customerId, {
    type: "completion_reported",
    title: t("notifications.completionReportedTitle", { title: titleOf(b) }),
    body: t("notifications.completionReportedBody"),
    href: `/bokanir/${b.id}`,
  });
}

/**
 * Marks a booking COMPLETED and records the fee decision in the same
 * transaction. Shared by customer confirmation and admin dispute resolution.
 */
async function completeInTx(tx: Tx, b: Booking, actorId: string, type: string, from: BookingStatus[], note?: string) {
  const now = new Date();
  const [settings, subscription] = await Promise.all([
    getSettings(tx),
    tx.subscription.findUnique({ where: { profileId: b.profileId }, include: { plan: true } }),
  ]);
  const planCode = subscription?.status === "ACTIVE" ? subscription.planCode : "BASIC";
  const plan = subscription?.status === "ACTIVE" ? subscription.plan : await tx.plan.findUniqueOrThrow({ where: { code: "BASIC" } });
  const decision = decideFee({ source: b.source, planCode, perJobFeeIsk: plan.perJobFeeIsk });

  await transition(tx, b, {
    from,
    to: "COMPLETED",
    actorId,
    type,
    note,
    data: { completedAt: now, completionConfirmedAt: now, feeEligible: decision.eligible, feeReason: decision.reason },
  });
  if (decision.eligible) {
    // bookingId is UNIQUE on platform_charges: a booking can never be charged twice.
    await tx.platformCharge.create({
      data: {
        bookingId: b.id,
        profileId: b.profileId,
        planCode,
        amountIsk: decision.amountIsk,
        vatRatePercent: settings.vatRatePercent,
        amountIncludesVat: settings.pricesIncludeVat,
        // Billing is not live: the fee is recorded only. See docs/BILLING.md.
        status: "RECORDED",
      },
    });
  }
}

export async function confirmCompletion(userId: string, bookingId: string) {
  const b = await loadForParty(bookingId, userId, "customer");
  if (!b.completionReportedAt) throw new UserError(t("errors.invalidTransition"));
  await db.$transaction((tx) => completeInTx(tx, b, userId, "completed", ["IN_PROGRESS"]));
  await notify(b.profile.userId, {
    type: "booking_completed",
    title: t("notifications.completedTitle", { title: titleOf(b) }),
    body: t("notifications.completedBody"),
    href: `/bokanir/${b.id}`,
  });
}

export const reasonSchema = z.string().trim().min(5, "reasonRequired").max(1000, "tooLong");

export async function cancelBooking(userId: string, bookingId: string, party: "customer" | "pro", reason: string) {
  const b = await loadForParty(bookingId, userId, party);
  await db.$transaction((tx) =>
    transition(tx, b, {
      from: ["ACCEPTED", "SCHEDULED"],
      to: "CANCELLED",
      actorId: userId,
      type: "cancelled",
      note: reason,
      // Cancelled bookings are never fee-bearing.
      data: { cancelledAt: new Date(), cancelledById: userId, cancelReason: reason, feeEligible: false, feeReason: "CANCELLED" },
    }),
  );
  const other = party === "customer" ? b.profile.userId : b.customerId;
  await notify(other, { type: "booking_cancelled", title: t("notifications.cancelledTitle", { title: titleOf(b) }), body: reason, href: `/bokanir/${b.id}` });
}

/** Either party can raise a dispute while work is in progress (customer any time, tradesperson after reporting completion). */
export async function openDispute(userId: string, bookingId: string, party: "customer" | "pro", reason: string) {
  const b = await loadForParty(bookingId, userId, party);
  if (party === "pro" && !b.completionReportedAt) throw new UserError(t("errors.invalidTransition"));
  await db.$transaction(async (tx) => {
    await transition(tx, b, { from: ["IN_PROGRESS"], to: "DISPUTED", actorId: userId, type: "dispute_opened", note: reason });
    await tx.dispute.create({ data: { bookingId: b.id, openedById: userId, reason, previousStatus: b.status } });
  });
  const other = party === "customer" ? b.profile.userId : b.customerId;
  const n = { type: "dispute_opened", title: t("notifications.disputeTitle", { title: titleOf(b) }), body: t("notifications.disputeBody"), href: `/bokanir/${b.id}` };
  await notify(other, n);
  await notifyAdmins({ ...n, href: `/stjornbord/bokanir/${b.id}` });
}

export async function resolveDispute(adminId: string, bookingId: string, outcome: "COMPLETED" | "CANCELLED", resolution: string) {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    include: { profile: { select: { userId: true } }, jobRequest: { select: { title: true } } },
  });
  if (!b) throw new UserError(t("errors.notFound"));
  await db.$transaction(async (tx) => {
    const dispute = await tx.dispute.findFirst({ where: { bookingId, status: "OPEN" } });
    if (!dispute) throw new UserError(t("errors.invalidTransition"));
    if (outcome === "COMPLETED") {
      await completeInTx(tx, b, adminId, "dispute_resolved", ["DISPUTED"], resolution);
    } else {
      await transition(tx, b, {
        from: ["DISPUTED"],
        to: "CANCELLED",
        actorId: adminId,
        type: "dispute_resolved",
        note: resolution,
        data: { cancelledAt: new Date(), cancelledById: adminId, cancelReason: resolution, feeEligible: false, feeReason: "DISPUTE_CANCELLED" },
      });
    }
    await tx.dispute.update({
      where: { id: dispute.id },
      data: { status: outcome === "COMPLETED" ? "RESOLVED_COMPLETED" : "RESOLVED_CANCELLED", resolution, resolvedById: adminId, resolvedAt: new Date() },
    });
    await audit({ actorId: adminId, action: "dispute.resolve", entityType: "Booking", entityId: bookingId, metadata: { outcome, resolution } }, tx);
  });
  const n = { type: "dispute_resolved", title: t("notifications.disputeResolvedTitle", { title: titleOf(b) }), body: resolution, href: `/bokanir/${b.id}` };
  await notify(b.customerId, n);
  await notify(b.profile.userId, n);
}

// ───────────────────────────── Messages ───────────────────────────────

export const messageSchema = z.string().trim().min(1, "messageEmpty").max(4000, "tooLong");

export async function sendBookingMessage(userId: string, bookingId: string, body: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { profile: { select: { userId: true } }, jobRequest: { select: { title: true } } },
  });
  if (!booking || (booking.customerId !== userId && booking.profile.userId !== userId)) throw new UserError(t("errors.forbidden"));
  await db.message.create({ data: { bookingId, senderId: userId, body } });
  const recipient = booking.customerId === userId ? booking.profile.userId : booking.customerId;
  // Avoid flooding: only notify if the recipient has no unread notification for this booking's messages.
  const pending = await db.notification.findFirst({
    where: { userId: recipient, type: "message", href: `/bokanir/${bookingId}`, readAt: null },
    select: { id: true },
  });
  if (!pending) {
    await notify(recipient, { type: "message", title: t("notifications.messageTitle", { title: titleOf(booking) }), body: body.slice(0, 200), href: `/bokanir/${bookingId}` });
  }
}

export async function markMessagesRead(userId: string, bookingId: string) {
  await db.message.updateMany({ where: { bookingId, senderId: { not: userId }, readAt: null }, data: { readAt: new Date() } });
  await db.notification.updateMany({ where: { userId, href: `/bokanir/${bookingId}`, readAt: null }, data: { readAt: new Date() } });
}
