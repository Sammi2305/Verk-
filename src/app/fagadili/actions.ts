"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { t } from "@/i18n";
import { type ActionState, UserError } from "@/lib/action";
import { requireTradesperson } from "@/lib/auth/guards";
import { fieldErrorsFrom } from "@/lib/zod-errors";
import { formDataToObject } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import {
  addQualification,
  profileSchema,
  qualificationSchema,
  removeQualification,
  setAcceptingRequests,
  submitProfileForReview,
  updateProfile,
} from "@/server/tradespeople";
import { acceptInvitation, acceptInvitationSchema, declineInvitation } from "@/server/job-requests";

function asArray(v: string | string[] | undefined): string[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

function handle(err: unknown, values?: Record<string, string | string[]>): ActionState {
  if (err instanceof UserError) return { error: err.message, fieldErrors: err.fieldErrors, values };
  throw err;
}

export async function saveProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { profile } = await requireTradesperson();
  const raw = formDataToObject(formData);
  const input = { ...raw, categoryIds: asArray(raw.categoryIds), areaIds: asArray(raw.areaIds) };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: input };
  try {
    await updateProfile(profile, parsed.data);
    if (raw.submit === "1") await submitProfileForReview(profile.id);
  } catch (err) {
    return handle(err, input);
  }
  revalidatePath("/fagadili", "layout");
  revalidatePath(`/fagfolk/${profile.slug}`);
  return { ok: true, message: raw.submit === "1" ? t("pro.submittedForReview") : t("common.saved") };
}

export async function toggleAcceptingAction(formData: FormData): Promise<void> {
  const { profile } = await requireTradesperson();
  await setAcceptingRequests(profile.id, formData.get("accepting") === "1");
  revalidatePath("/fagadili", "layout");
}

export async function addQualificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { profile } = await requireTradesperson();
  const raw = formDataToObject(formData);
  const parsed = qualificationSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: raw };
  try {
    await addQualification(profile.id, parsed.data);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/fagadili/profill");
  return { ok: true, message: t("common.saved") };
}

export async function removeQualificationAction(formData: FormData): Promise<void> {
  const { profile } = await requireTradesperson();
  await removeQualification(profile.id, String(formData.get("id") ?? ""));
  revalidatePath("/fagadili/profill");
}

export async function respondToInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, profile } = await requireTradesperson();
  const raw = formDataToObject(formData);
  const invitationId = String(raw.invitationId ?? "");
  const values = raw;
  if (!user.emailVerified) return { error: t("errors.emailNotVerified"), values };
  if (!(await rateLimit(`respond:${user.id}`, 60, 3600))) return { error: t("errors.rateLimited"), values };
  const parsed = acceptInvitationSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  try {
    await acceptInvitation(profile.id, invitationId, parsed.data);
  } catch (err) {
    return handle(err, values);
  }
  revalidatePath("/fagadili", "layout");
  return { ok: true, message: t("invitation.responded") };
}

export async function declineInvitationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { profile } = await requireTradesperson();
  const id = z.string().max(40).parse(formData.get("invitationId"));
  try {
    await declineInvitation(profile.id, id, String(formData.get("reason") ?? "") || null);
  } catch (err) {
    return handle(err);
  }
  revalidatePath("/fagadili", "layout");
  redirect(`/fagadili/beidnir/${id}`);
}
