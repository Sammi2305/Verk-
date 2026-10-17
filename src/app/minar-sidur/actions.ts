"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { type ActionState, UserError } from "@/lib/action";
import { requireUser } from "@/lib/auth/guards";
import { destroyCurrentSession } from "@/lib/auth/session";
import { fieldErrorsFrom } from "@/lib/zod-errors";
import { formDataToObject } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { cancelJobRequest, confirmBooking } from "@/server/job-requests";
import { accountSchema, deleteAccount, updateAccount } from "@/server/account";

export async function confirmBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  let bookingId: string;
  try {
    const booking = await confirmBooking(user.id, String(formData.get("invitationId") ?? ""));
    bookingId = booking.id;
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    throw err;
  }
  revalidatePath("/minar-sidur", "layout");
  redirect(`/bokanir/${bookingId}`);
}

export async function cancelRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("jobRequestId") ?? "");
  try {
    await cancelJobRequest(user.id, id);
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    throw err;
  }
  revalidatePath("/minar-sidur", "layout");
  return { ok: true, message: t("request.cancelled") };
}

export async function updateAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const raw = formDataToObject(formData);
  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: raw };
  await updateAccount(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: t("common.saved") };
}

export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await rateLimit(`delete-account:${user.id}`, 5, 3600))) return { error: t("errors.rateLimited") };
  try {
    await deleteAccount(user.id, String(formData.get("password") ?? ""));
  } catch (err) {
    if (err instanceof UserError) return { error: err.message, fieldErrors: err.fieldErrors };
    throw err;
  }
  await destroyCurrentSession();
  redirect("/");
}
