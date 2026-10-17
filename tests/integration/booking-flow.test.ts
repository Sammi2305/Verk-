import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, hoursFromNow, makeCustomer, makePro, requestInput, resetDb } from "./helpers";
import {
  acceptInvitation,
  cancelJobRequest,
  confirmBooking,
  createJobRequest,
  declineInvitation,
  getInvitationForPro,
} from "@/server/job-requests";
import {
  cancelBooking,
  confirmCompletion,
  getBookingForViewer,
  openDispute,
  reportCompletion,
  resolveDispute,
  scheduleBooking,
  startBooking,
} from "@/server/bookings";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { verifyEmail } from "@/server/auth";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const accept = (overrides: Partial<Parameters<typeof acceptInvitation>[2]> = {}) => ({
  priceType: "FIXED" as const,
  priceAmountIsk: 45000,
  priceNote: "Vinna og akstur",
  message: "Get komið í vikunni.",
  start: null,
  end: null,
  ...overrides,
});

async function bookedScenario(plan: "BASIC" | "PRO" = "BASIC") {
  const customer = await makeCustomer();
  const pro = await makePro({ plan });
  const request = await createJobRequest({ id: customer.id, emailVerified: true }, requestInput(pro.category.id, pro.area.id, [pro.profile.id]), []);
  const inv = await db.jobInvitation.findFirstOrThrow({ where: { jobRequestId: request.id } });
  await acceptInvitation(pro.profile.id, inv.id, accept());
  const booking = await confirmBooking(customer.id, inv.id);
  return { customer, pro, request, inv, booking };
}

async function runToCompletion(s: Awaited<ReturnType<typeof bookedScenario>>) {
  await scheduleBooking(s.pro.user.id, s.booking.id, hoursFromNow(24), hoursFromNow(27));
  await startBooking(s.pro.user.id, s.booking.id);
  await reportCompletion(s.pro.user.id, s.booking.id);
  await confirmCompletion(s.customer.id, s.booking.id);
}

describe("customer → tradesperson booking workflow", () => {
  it("runs the full happy path and records a Basic platform fee exactly once", async () => {
    const s = await bookedScenario("BASIC");
    expect(s.booking.status).toBe("ACCEPTED");
    expect(s.booking.priceAmountIsk).toBe(45000);
    expect(s.booking.source).toBe("PLATFORM");

    // Both parties can view; a stranger cannot.
    const stranger = await makeCustomer();
    expect(await getBookingForViewer(s.booking.id, { id: s.customer.id, role: "CUSTOMER" })).toMatchObject({ party: "customer" });
    expect(await getBookingForViewer(s.booking.id, { id: s.pro.user.id, role: "TRADESPERSON" })).toMatchObject({ party: "pro" });
    expect(await getBookingForViewer(s.booking.id, { id: stranger.id, role: "CUSTOMER" })).toBeNull();

    await runToCompletion(s);
    const done = await db.booking.findUniqueOrThrow({ where: { id: s.booking.id }, include: { charge: true, events: true } });
    expect(done.status).toBe("COMPLETED");
    expect(done.feeEligible).toBe(true);
    expect(done.feeReason).toBe("BASIC_PLATFORM_JOB");
    expect(done.charge).toMatchObject({ amountIsk: 990, status: "RECORDED", planCode: "BASIC", vatRatePercent: 24, amountIncludesVat: false });
    expect(done.events.map((e) => e.type)).toEqual(["created", "scheduled", "started", "completion_reported", "completed"]);

    // A repeated confirmation (double click / second tab) fails and never double-charges.
    await expect(confirmCompletion(s.customer.id, s.booking.id)).rejects.toThrow();
    expect(await db.platformCharge.count({ where: { bookingId: s.booking.id } })).toBe(1);
  });

  it("uses the admin-configured fee at completion time", async () => {
    await db.plan.update({ where: { code: "BASIC" }, data: { perJobFeeIsk: 1290 } });
    const s = await bookedScenario("BASIC");
    await runToCompletion(s);
    expect((await db.platformCharge.findUniqueOrThrow({ where: { bookingId: s.booking.id } })).amountIsk).toBe(1290);
  });

  it("records no fee for Pro tradespeople", async () => {
    const s = await bookedScenario("PRO");
    await runToCompletion(s);
    const done = await db.booking.findUniqueOrThrow({ where: { id: s.booking.id }, include: { charge: true } });
    expect(done.feeEligible).toBe(false);
    expect(done.feeReason).toBe("PRO_PLAN");
    expect(done.charge).toBeNull();
  });

  it("records no fee when a booking is cancelled", async () => {
    const s = await bookedScenario();
    await cancelBooking(s.customer.id, s.booking.id, "customer", "Þarf ekki lengur");
    const b = await db.booking.findUniqueOrThrow({ where: { id: s.booking.id }, include: { charge: true } });
    expect(b.status).toBe("CANCELLED");
    expect(b.feeEligible).toBe(false);
    expect(b.charge).toBeNull();
  });

  it("does not complete a booking until the customer confirms", async () => {
    const s = await bookedScenario();
    await scheduleBooking(s.pro.user.id, s.booking.id, hoursFromNow(24), hoursFromNow(26));
    await reportCompletion(s.pro.user.id, s.booking.id);
    const b = await db.booking.findUniqueOrThrow({ where: { id: s.booking.id } });
    expect(b.status).toBe("IN_PROGRESS");
    expect(b.feeEligible).toBeNull();
    // The tradesperson cannot confirm on the customer's behalf.
    await expect(confirmCompletion(s.pro.user.id, s.booking.id)).rejects.toThrow();
  });

  it("prevents a request from being booked twice", async () => {
    const customer = await makeCustomer();
    const a = await makePro();
    const b = await makePro();
    const request = await createJobRequest({ id: customer.id, emailVerified: true }, requestInput(a.category.id, a.area.id, [a.profile.id, b.profile.id]), []);
    const [invA, invB] = await Promise.all([
      db.jobInvitation.findFirstOrThrow({ where: { jobRequestId: request.id, profileId: a.profile.id } }),
      db.jobInvitation.findFirstOrThrow({ where: { jobRequestId: request.id, profileId: b.profile.id } }),
    ]);
    await acceptInvitation(a.profile.id, invA.id, accept());
    await acceptInvitation(b.profile.id, invB.id, accept({ priceType: "INSPECTION", priceAmountIsk: null }));
    const results = await Promise.allSettled([confirmBooking(customer.id, invA.id), confirmBooking(customer.id, invB.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.booking.count({ where: { jobRequestId: request.id } })).toBe(1);
  });

  it("prevents double booking a tradesperson's time (app check and DB constraint)", async () => {
    const s1 = await bookedScenario();
    const customer2 = await makeCustomer();
    const r2 = await createJobRequest({ id: customer2.id, emailVerified: true }, requestInput(s1.pro.category.id, s1.pro.area.id, [s1.pro.profile.id]), []);
    const inv2 = await db.jobInvitation.findFirstOrThrow({ where: { jobRequestId: r2.id } });
    await acceptInvitation(s1.pro.profile.id, inv2.id, accept());
    const b2 = await confirmBooking(customer2.id, inv2.id);

    await scheduleBooking(s1.pro.user.id, s1.booking.id, hoursFromNow(48), hoursFromNow(51));
    await expect(scheduleBooking(s1.pro.user.id, b2.id, hoursFromNow(50), hoursFromNow(52))).rejects.toThrow(/skarast/);
    // Adjacent slot is fine.
    await scheduleBooking(s1.pro.user.id, b2.id, hoursFromNow(51), hoursFromNow(52));

    // The exclusion constraint rejects overlaps even if application code is bypassed.
    await expect(
      db.booking.update({ where: { id: b2.id }, data: { scheduledStart: hoursFromNow(49), scheduledEnd: hoursFromNow(52) } }),
    ).rejects.toThrow(/booking_no_overlap/);
  });

  it("only lets the right party perform each action", async () => {
    const s = await bookedScenario();
    const other = await makePro();
    await expect(scheduleBooking(s.customer.id, s.booking.id, hoursFromNow(5), hoursFromNow(6))).rejects.toThrow();
    await expect(scheduleBooking(other.user.id, s.booking.id, hoursFromNow(5), hoursFromNow(6))).rejects.toThrow();
    await expect(cancelBooking(other.user.id, s.booking.id, "pro", "Engin ástæða")).rejects.toThrow();
    await expect(acceptInvitation(other.profile.id, s.inv.id, accept())).rejects.toThrow();
    await expect(confirmBooking(other.user.id, s.inv.id)).rejects.toThrow();
  });

  it("hides the street address from invited tradespeople until booked", async () => {
    const customer = await makeCustomer();
    const pro = await makePro();
    const request = await createJobRequest({ id: customer.id, emailVerified: true }, requestInput(pro.category.id, pro.area.id, [pro.profile.id]), []);
    const inv = await db.jobInvitation.findFirstOrThrow({ where: { jobRequestId: request.id } });
    const view = await getInvitationForPro(inv.id, pro.profile.id);
    expect(view).not.toBeNull();
    expect(JSON.stringify(view)).not.toContain("Laugavegur");
    expect(view!.jobRequest.customer.name).toBe("Viðskiptavinur");
    expect(await getInvitationForPro(inv.id, (await makePro()).profile.id)).toBeNull();
  });

  it("rejects invitations to paused, unapproved or unrelated tradespeople", async () => {
    const customer = await makeCustomer();
    const paused = await makePro({ accepting: false });
    const pending = await makePro({ status: "PENDING_REVIEW" });
    const otherCat = await makePro({ categorySlug: "malari" });
    for (const p of [paused, pending, otherCat]) {
      await expect(
        createJobRequest({ id: customer.id, emailVerified: true }, requestInput(paused.category.id, paused.area.id, [p.profile.id]), []),
      ).rejects.toThrow();
    }
    expect(await db.jobRequest.count()).toBe(0);
  });

  it("enforces the configured maximum number of invitations", async () => {
    const customer = await makeCustomer();
    const pros = await Promise.all([makePro(), makePro(), makePro(), makePro()]);
    await expect(
      createJobRequest({ id: customer.id, emailVerified: true }, requestInput(pros[0].category.id, pros[0].area.id, pros.map((p) => p.profile.id)), []),
    ).rejects.toThrow(/hámarki 3/);
  });

  it("saves requests from unverified customers as drafts and sends them on verification", async () => {
    const customer = await makeCustomer({ verified: false });
    const pro = await makePro();
    const request = await createJobRequest({ id: customer.id, emailVerified: false }, requestInput(pro.category.id, pro.area.id, [pro.profile.id]), []);
    expect(request.status).toBe("DRAFT");
    expect(await db.notification.count({ where: { userId: pro.user.id } })).toBe(0);

    const token = generateToken();
    await db.emailToken.create({ data: { userId: customer.id, type: "VERIFY_EMAIL", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
    const res = await verifyEmail(token);
    expect(res?.submittedDrafts).toBe(1);
    expect((await db.jobRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("SUBMITTED");
    expect(await db.notification.count({ where: { userId: pro.user.id, type: "new_request" } })).toBe(1);
    // Tokens are single-use.
    expect(await verifyEmail(token)).toBeNull();
  });

  it("handles declines and request cancellation without any fee", async () => {
    const customer = await makeCustomer();
    const a = await makePro();
    const b = await makePro();
    const request = await createJobRequest({ id: customer.id, emailVerified: true }, requestInput(a.category.id, a.area.id, [a.profile.id, b.profile.id]), []);
    const invA = await db.jobInvitation.findFirstOrThrow({ where: { jobRequestId: request.id, profileId: a.profile.id } });
    await declineInvitation(a.profile.id, invA.id, "Of mikið að gera");
    await expect(declineInvitation(a.profile.id, invA.id, null)).rejects.toThrow();
    await cancelJobRequest(customer.id, request.id);
    const invs = await db.jobInvitation.findMany({ where: { jobRequestId: request.id } });
    expect(invs.map((i) => i.status).sort()).toEqual(["DECLINED", "NOT_SELECTED"]);
    expect(await db.platformCharge.count()).toBe(0);
  });

  it("resolves disputes: completed → fee recorded, cancelled → no fee", async () => {
    const admin = await db.user.create({ data: { email: "admin@test.is", name: "Admin", role: "ADMIN", passwordHash: "x" } });
    for (const outcome of ["COMPLETED", "CANCELLED"] as const) {
      const s = await bookedScenario();
      await scheduleBooking(s.pro.user.id, s.booking.id, hoursFromNow(outcome === "COMPLETED" ? 10 : 20), hoursFromNow(outcome === "COMPLETED" ? 11 : 21));
      await reportCompletion(s.pro.user.id, s.booking.id);
      await openDispute(s.customer.id, s.booking.id, "customer", "Lekinn er enn til staðar");
      expect((await db.booking.findUniqueOrThrow({ where: { id: s.booking.id } })).status).toBe("DISPUTED");
      await resolveDispute(admin.id, s.booking.id, outcome, "Farið yfir málið með báðum aðilum");
      const b = await db.booking.findUniqueOrThrow({ where: { id: s.booking.id }, include: { charge: true, disputes: true } });
      expect(b.status).toBe(outcome);
      expect(b.charge?.amountIsk ?? null).toBe(outcome === "COMPLETED" ? 990 : null);
      expect(b.disputes[0].status).toBe(outcome === "COMPLETED" ? "RESOLVED_COMPLETED" : "RESOLVED_CANCELLED");
      expect(await db.auditLog.count({ where: { entityId: s.booking.id, action: "dispute.resolve" } })).toBe(1);
    }
  });
});
