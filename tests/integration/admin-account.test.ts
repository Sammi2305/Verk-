import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, makeCustomer, makePro, requestInput, resetDb } from "./helpers";
import { acceptInvitation, confirmBooking, createJobRequest } from "@/server/job-requests";
import { confirmCompletion, reportCompletion, scheduleBooking } from "@/server/bookings";
import { adjustCharge, pricingSchema, setUserStatus, updatePricing, verifyEmailManually } from "@/server/admin";
import { deleteAccount } from "@/server/account";
import { reviewProfile } from "@/server/tradespeople";
import { hashPassword } from "@/lib/auth/password";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function makeAdmin() {
  return db.user.create({ data: { email: `admin-${Date.now()}@test.is`, name: "Stjórnandi", role: "ADMIN", passwordHash: "x", emailVerifiedAt: new Date() } });
}

async function completedBooking() {
  const customer = await makeCustomer();
  const pro = await makePro();
  const r = await createJobRequest({ id: customer.id, emailVerified: true }, requestInput(pro.category.id, pro.area.id, [pro.profile.id]), []);
  const inv = await db.jobInvitation.findFirstOrThrow({ where: { jobRequestId: r.id } });
  await acceptInvitation(pro.profile.id, inv.id, { priceType: "HOURLY", priceAmountIsk: 12000, priceNote: null, message: null, start: null, end: null });
  const b = await confirmBooking(customer.id, inv.id);
  const start = new Date(Date.now() + 86400_000);
  await scheduleBooking(pro.user.id, b.id, start, new Date(start.getTime() + 3600_000));
  await reportCompletion(pro.user.id, b.id);
  await confirmCompletion(customer.id, b.id);
  return { customer, pro, booking: b };
}

describe("admin operations", () => {
  it("waives a charge only with a reason, and records the adjustment + audit log", async () => {
    const admin = await makeAdmin();
    const { booking } = await completedBooking();
    const charge = await db.platformCharge.findUniqueOrThrow({ where: { bookingId: booking.id } });
    await expect(adjustCharge(admin.id, charge.id, "WAIVED", "")).rejects.toThrow();
    await expect(adjustCharge(admin.id, charge.id, "PAID", "Greitt")).rejects.toThrow(); // not allowed from RECORDED
    await adjustCharge(admin.id, charge.id, "WAIVED", "Fyrsta verk, fellt niður");
    expect((await db.platformCharge.findUniqueOrThrow({ where: { id: charge.id } })).status).toBe("WAIVED");
    expect(await db.chargeAdjustment.count({ where: { chargeId: charge.id } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "charge.adjust", entityId: charge.id } })).toBe(1);
  });

  it("updates prices without touching already-recorded charges", async () => {
    const admin = await makeAdmin();
    const { booking } = await completedBooking();
    const input = pricingSchema.parse({ basicPerJobFeeIsk: "1490", proMonthlyPriceIsk: "6990", vatRatePercent: "24", maxInvitesPerRequest: "3" });
    await updatePricing(admin.id, input);
    expect((await db.plan.findUniqueOrThrow({ where: { code: "BASIC" } })).perJobFeeIsk).toBe(1490);
    expect((await db.platformCharge.findUniqueOrThrow({ where: { bookingId: booking.id } })).amountIsk).toBe(990);
    expect(await db.auditLog.count({ where: { action: "settings.pricing.update" } })).toBe(1);
    expect(pricingSchema.safeParse({ ...input, basicPerJobFeeIsk: "-5" }).success).toBe(false);
  });

  it("suspends users, revokes their sessions, and refuses self-suspension", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer();
    await db.session.create({ data: { userId: customer.id, tokenHash: `h-${Date.now()}`, expiresAt: new Date(Date.now() + 3600_000) } });
    await setUserStatus(admin.id, customer.id, "SUSPENDED", "Grunur um svik");
    expect((await db.user.findUniqueOrThrow({ where: { id: customer.id } })).status).toBe("SUSPENDED");
    expect(await db.session.count({ where: { userId: customer.id } })).toBe(0);
    await expect(setUserStatus(admin.id, admin.id, "SUSPENDED", "Prófun á sjálfan sig")).rejects.toThrow();
  });

  it("cannot approve a profile whose e-mail is unverified; rejection requires a note", async () => {
    const admin = await makeAdmin();
    const pro = await makePro({ status: "PENDING_REVIEW" });
    await db.user.update({ where: { id: pro.user.id }, data: { emailVerifiedAt: null } });
    await expect(reviewProfile(admin.id, pro.profile.id, "APPROVED", null)).rejects.toThrow();
    await expect(reviewProfile(admin.id, pro.profile.id, "REJECTED", null)).rejects.toThrow();
    await reviewProfile(admin.id, pro.profile.id, "REJECTED", "Vantar lýsingu á þjónustu");
    expect((await db.tradespersonProfile.findUniqueOrThrow({ where: { id: pro.profile.id } })).status).toBe("REJECTED");
  });
});

describe("manual e-mail verification (while e-mail delivery is off)", () => {
  it("requires a reason, verifies, sends waiting drafts and writes the audit log", async () => {
    const admin = await makeAdmin();
    const customer = await makeCustomer({ verified: false });
    const pro = await makePro();
    const draft = await createJobRequest({ id: customer.id, emailVerified: false }, requestInput(pro.category.id, pro.area.id, [pro.profile.id]), []);
    expect(draft.status).toBe("DRAFT");

    await expect(verifyEmailManually(admin.id, customer.id, "")).rejects.toThrow();
    await verifyEmailManually(admin.id, customer.id, "Staðfest í símtali");
    expect((await db.user.findUniqueOrThrow({ where: { id: customer.id } })).emailVerifiedAt).not.toBeNull();
    expect((await db.jobRequest.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe("SUBMITTED");
    expect(await db.auditLog.count({ where: { action: "user.email_verify_manual", entityId: customer.id } })).toBe(1);

    // Repeating it is harmless and does not log twice.
    await verifyEmailManually(admin.id, customer.id, "Staðfest í símtali");
    expect(await db.auditLog.count({ where: { action: "user.email_verify_manual", entityId: customer.id } })).toBe(1);
  });
});

describe("account deletion", () => {
  it("removes personal data but keeps anonymised completed bookings and charges", async () => {
    const { customer, booking } = await completedBooking();
    await db.user.update({ where: { id: customer.id }, data: { passwordHash: await hashPassword("password-1234") } });
    await expect(deleteAccount(customer.id, "wrong-password")).rejects.toThrow();
    await deleteAccount(customer.id, "password-1234");
    const u = await db.user.findUniqueOrThrow({ where: { id: customer.id } });
    expect(u.status).toBe("DELETED");
    expect(u.email).not.toContain("@test.is");
    expect(u.phone).toBeNull();
    const req = await db.jobRequest.findFirstOrThrow({ where: { customerId: customer.id } });
    expect(req.addressLine).toBe("[eytt]");
    expect(await db.booking.count({ where: { id: booking.id } })).toBe(1);
    expect(await db.platformCharge.count({ where: { bookingId: booking.id } })).toBe(1);
  });

  it("is blocked while bookings are still open", async () => {
    const customer = await makeCustomer();
    const pro = await makePro();
    await db.user.update({ where: { id: customer.id }, data: { passwordHash: await hashPassword("password-1234") } });
    const r = await createJobRequest({ id: customer.id, emailVerified: true }, requestInput(pro.category.id, pro.area.id, [pro.profile.id]), []);
    const inv = await db.jobInvitation.findFirstOrThrow({ where: { jobRequestId: r.id } });
    await acceptInvitation(pro.profile.id, inv.id, { priceType: "INSPECTION", priceAmountIsk: null, priceNote: null, message: null, start: null, end: null });
    await confirmBooking(customer.id, inv.id);
    await expect(deleteAccount(customer.id, "password-1234")).rejects.toThrow(/ólokið/);
  });
});
