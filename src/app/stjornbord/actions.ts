"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { t } from "@/i18n";
import { type ActionState, UserError } from "@/lib/action";
import { requireAdmin } from "@/lib/auth/guards";
import { fieldErrorsFrom } from "@/lib/zod-errors";
import { formDataToObject } from "@/lib/validation";
import { reviewProfile, reviewQualification } from "@/server/tradespeople";
import { resolveDispute } from "@/server/bookings";
import { adjustCharge, categorySchema, pricingSchema, saveCategory, setAreaActive, setUserStatus, updatePricing, verifyEmailManually } from "@/server/admin";

// Admin-only. requireAdmin() returns 404 for everyone else.

async function guarded(fn: () => Promise<void>, paths: string[], message = t("common.saved")): Promise<ActionState> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof UserError) return { error: err.message, fieldErrors: err.fieldErrors };
    throw err;
  }
  paths.forEach((p) => revalidatePath(p));
  return { ok: true, message };
}

const id = z.string().min(1).max(40);
const note = (fd: FormData) => String(fd.get("note") ?? "").trim() || null;

export async function reviewProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const profileId = id.parse(fd.get("profileId"));
  const decision = z.enum(["APPROVED", "REJECTED", "SUSPENDED"]).parse(fd.get("decision"));
  return guarded(
    () => reviewProfile(admin.id, profileId, decision, note(fd)),
    [`/stjornbord/fagadilar/${profileId}`, "/stjornbord/fagadilar", "/stjornbord"],
    decision === "APPROVED" ? t("admin.approved") : t("admin.rejected"),
  );
}

export async function reviewQualificationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const qualificationId = id.parse(fd.get("qualificationId"));
  const decision = z.enum(["VERIFIED", "REJECTED"]).parse(fd.get("decision"));
  const profileId = id.parse(fd.get("profileId"));
  return guarded(() => reviewQualification(admin.id, qualificationId, decision, note(fd)), [`/stjornbord/fagadilar/${profileId}`]);
}

export async function resolveDisputeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const bookingId = id.parse(fd.get("bookingId"));
  const outcome = z.enum(["COMPLETED", "CANCELLED"]).parse(fd.get("outcome"));
  const resolution = String(fd.get("note") ?? "").trim();
  if (resolution.length < 5) return { error: t("errors.reasonRequired") };
  return guarded(() => resolveDispute(admin.id, bookingId, outcome, resolution), [`/stjornbord/bokanir/${bookingId}`, `/bokanir/${bookingId}`]);
}

export async function adjustChargeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const chargeId = id.parse(fd.get("chargeId"));
  const status = z.enum(["RECORDED", "INVOICED", "PAID", "WAIVED", "REFUNDED"]).safeParse(fd.get("status"));
  if (!status.success) return { error: t("errors.invalidTransition") };
  return guarded(() => adjustCharge(admin.id, chargeId, status.data, String(fd.get("note") ?? "")), ["/stjornbord/gjold"]);
}

export async function saveCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const raw = formDataToObject(fd);
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: raw };
  const res = await guarded(() => saveCategory(admin.id, parsed.data), ["/stjornbord/flokkar", "/flokkar", "/"]);
  return res.ok ? res : { ...res, values: raw };
}

export async function toggleAreaAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  await setAreaActive(admin.id, id.parse(fd.get("areaId")), fd.get("active") === "1");
  revalidatePath("/stjornbord/flokkar");
}

export async function updatePricingAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const raw = formDataToObject(fd);
  const parsed = pricingSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: raw };
  return guarded(() => updatePricing(admin.id, parsed.data), ["/stjornbord/stillingar", "/verdskra"]);
}

export async function setUserStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = id.parse(fd.get("userId"));
  const status = z.enum(["ACTIVE", "SUSPENDED"]).parse(fd.get("status"));
  return guarded(() => setUserStatus(admin.id, userId, status, String(fd.get("note") ?? "")), ["/stjornbord/notendur"]);
}

export async function verifyEmailAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = id.parse(fd.get("userId"));
  return guarded(
    () => verifyEmailManually(admin.id, userId, String(fd.get("note") ?? "")),
    ["/stjornbord/notendur", "/stjornbord/fagadilar"],
    t("admin.verifyEmailDone"),
  );
}
