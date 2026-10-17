"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { t } from "@/i18n";
import { type ActionState, UserError } from "@/lib/action";
import { requireUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { fieldErrorsFrom } from "@/lib/zod-errors";
import { formDataToObject } from "@/lib/validation";
import {
  cancelBooking,
  confirmCompletion,
  messageSchema,
  openDispute,
  reasonSchema,
  reportCompletion,
  scheduleBooking,
  sendBookingMessage,
  startBooking,
} from "@/server/bookings";
import { refineTimeRange, timeRangeShape } from "@/server/job-requests";

// Every action re-loads the booking server-side and checks that the signed-in
// user is the right party; see src/server/bookings.ts.

function party(role: string): "customer" | "pro" {
  return role === "TRADESPERSON" ? "pro" : "customer";
}

async function run(bookingId: string, fn: () => Promise<void>, values?: Record<string, string | string[]>): Promise<ActionState> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof UserError) return { error: err.message, fieldErrors: err.fieldErrors, values };
    throw err;
  }
  revalidatePath(`/bokanir/${bookingId}`);
  return { ok: true };
}

const idOf = (fd: FormData) => z.string().max(40).parse(fd.get("bookingId"));

const scheduleSchema = z.object(timeRangeShape).superRefine((v, ctx) => refineTimeRange(v, ctx, { required: true }));

export async function scheduleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = idOf(fd);
  const raw = formDataToObject(fd);
  const parsed = scheduleSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: raw };
  return run(id, () => scheduleBooking(user.id, id, parsed.data.start!, parsed.data.end!), raw);
}

export async function startAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = idOf(fd);
  return run(id, () => startBooking(user.id, id));
}

export async function reportCompletionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = idOf(fd);
  return run(id, () => reportCompletion(user.id, id));
}

export async function confirmCompletionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = idOf(fd);
  return run(id, () => confirmCompletion(user.id, id));
}

export async function cancelBookingAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = idOf(fd);
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!reason.success) return { fieldErrors: { reason: t("errors.reasonRequired") } };
  return run(id, () => cancelBooking(user.id, id, party(user.role), reason.data));
}

export async function disputeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = idOf(fd);
  const reason = reasonSchema.safeParse(fd.get("reason"));
  if (!reason.success) return { fieldErrors: { reason: t("errors.reasonRequired") } };
  return run(id, () => openDispute(user.id, id, party(user.role), reason.data));
}

export async function sendMessageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = idOf(fd);
  if (!(await rateLimit(`message:${user.id}`, 60, 600))) return { error: t("errors.rateLimited") };
  const body = messageSchema.safeParse(fd.get("body"));
  if (!body.success) return { fieldErrors: { body: t("errors.messageEmpty") } };
  return run(id, () => sendBookingMessage(user.id, id, body.data));
}
