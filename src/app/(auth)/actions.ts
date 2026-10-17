"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { t } from "@/i18n";
import { type ActionState, UserError } from "@/lib/action";
import { createSession, destroyCurrentSession, getCurrentUser } from "@/lib/auth/session";
import { homeForRole, safeNext } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { fieldErrorsFrom } from "@/lib/zod-errors";
import { emailSchema, formDataToObject, passwordSchema } from "@/lib/validation";
import {
  authenticate,
  customerRegistrationSchema,
  registerCustomer,
  registerTradesperson,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  tradespersonRegistrationSchema,
  verifyEmail,
} from "@/server/auth";

function keepValues(raw: Record<string, unknown>, omit: string[] = ["password"]) {
  return Object.fromEntries(Object.entries(raw).filter(([k, v]) => typeof v === "string" && !omit.includes(k))) as Record<string, string>;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formDataToObject(formData);
  const email = String(raw.email ?? "").trim().toLowerCase();
  const password = String(raw.password ?? "");
  const values = { email };
  const ip = await clientIp();
  if (!(await rateLimit(`login:ip:${ip}`, 30, 900)) || !(await rateLimit(`login:email:${email}`, 10, 900))) {
    return { error: t("errors.rateLimited"), values };
  }
  const user = email && password ? await authenticate(email, password) : null;
  if (!user) return { error: t("auth.invalidCredentials"), values };
  if (user.status === "SUSPENDED") return { error: t("auth.accountSuspended"), values };
  await createSession(user.id);
  redirect(safeNext(raw.next, homeForRole(user.role)));
}

export async function registerCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formDataToObject(formData);
  const values = keepValues(raw);
  if (!(await rateLimit(`register:ip:${await clientIp()}`, 10, 3600))) return { error: t("errors.rateLimited"), values };
  const parsed = customerRegistrationSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  try {
    const user = await registerCustomer(parsed.data);
    await createSession(user.id);
  } catch (err) {
    if (err instanceof UserError) return { error: err.message, fieldErrors: err.fieldErrors, values };
    throw err;
  }
  // Continue where the customer was (e.g. the job request form); the request
  // is saved and sent once the e-mail address is verified.
  const next = safeNext(raw.next, "");
  redirect(next || "/nyskraning/stadfesta");
}

export async function registerTradespersonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formDataToObject(formData);
  const values = keepValues(raw);
  if (!(await rateLimit(`register:ip:${await clientIp()}`, 10, 3600))) return { error: t("errors.rateLimited"), values };
  const parsed = tradespersonRegistrationSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  try {
    const user = await registerTradesperson(parsed.data);
    await createSession(user.id);
  } catch (err) {
    if (err instanceof UserError) return { error: err.message, fieldErrors: err.fieldErrors, values };
    throw err;
  }
  redirect("/fagadili/profill?nytt=1");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/");
}

export async function resendVerificationAction(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/innskraning");
  if (user.emailVerified) return { ok: true, message: t("auth.verifySuccess") };
  if (!(await rateLimit(`verify-resend:${user.id}`, 3, 3600))) return { error: t("errors.rateLimited") };
  await sendVerificationEmail(user);
  return { ok: true, message: t("auth.resent") };
}

export async function verifyEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit(`verify:ip:${await clientIp()}`, 30, 3600))) return { error: t("errors.rateLimited") };
  const result = await verifyEmail(String(formData.get("token") ?? ""));
  if (!result) return { error: t("auth.verifyInvalid") };
  return {
    ok: true,
    message: result.submittedDrafts > 0 ? `${t("auth.verifySuccess")} ${t("auth.verifySentDrafts")}` : t("auth.verifySuccess"),
  };
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: t("errors.invalidEmail") } };
  const ip = await clientIp();
  if (!(await rateLimit(`reset:ip:${ip}`, 10, 3600)) || !(await rateLimit(`reset:email:${parsed.data}`, 3, 3600))) {
    return { error: t("errors.rateLimited") };
  }
  await requestPasswordReset(parsed.data);
  return { ok: true, message: t("auth.forgotSent") };
}

const resetSchema = z.object({ token: z.string().min(10).max(100), password: passwordSchema });

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit(`reset-submit:ip:${await clientIp()}`, 20, 3600))) return { error: t("errors.rateLimited") };
  const parsed = resetSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const ok = await resetPassword(parsed.data.token, parsed.data.password);
  if (!ok) return { error: t("auth.verifyInvalid") };
  return { ok: true, message: t("auth.resetDone") };
}
