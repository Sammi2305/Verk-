import "server-only";
import { z } from "zod";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { t } from "@/i18n";
import { hashPassword, verifyPassword, getDummyHash } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { absoluteUrl, composeEmail, sendEmail } from "@/lib/mail";
import { emailSchema, isValidKennitala, nameSchema, normalizeKennitala, optionalPhoneSchema, passwordSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { UserError } from "@/lib/action";
import { submitDraftsForUser } from "./job-requests";

const VERIFY_TTL_MS = 48 * 3600_000;
const RESET_TTL_MS = 3600_000;

export const customerRegistrationSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  password: passwordSchema,
  terms: z.literal("on", { errorMap: () => ({ message: "termsRequired" }) }),
});

export const tradespersonRegistrationSchema = customerRegistrationSchema.extend({
  businessName: z.string().trim().min(2, "nameTooShort").max(100, "tooLong"),
  companyId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : normalizeKennitala(v)))
    .refine((v) => v === null || isValidKennitala(v), "invalidKennitala"),
});

async function uniqueProfileSlug(base: string): Promise<string> {
  const root = slugify(base) || "fagadili";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const taken = await db.tradespersonProfile.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${generateToken().slice(0, 6).toLowerCase()}`;
}

export async function registerCustomer(input: z.infer<typeof customerRegistrationSchema>): Promise<User> {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new UserError(t("errors.emailTaken"), { email: t("errors.emailTaken") });
  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name,
      phone: input.phone,
      role: "CUSTOMER",
      passwordHash: await hashPassword(input.password),
    },
  });
  await sendVerificationEmail(user);
  return user;
}

export async function registerTradesperson(input: z.infer<typeof tradespersonRegistrationSchema>): Promise<User> {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new UserError(t("errors.emailTaken"), { email: t("errors.emailTaken") });
  const passwordHash = await hashPassword(input.password);
  const slug = await uniqueProfileSlug(input.businessName);
  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name,
      phone: input.phone,
      role: "TRADESPERSON",
      passwordHash,
      tradesperson: {
        create: {
          slug,
          businessName: input.businessName,
          companyId: input.companyId,
          subscription: { create: { planCode: "BASIC" } },
        },
      },
    },
  });
  await sendVerificationEmail(user);
  return user;
}

/** Returns the user on success; null for any failure (no user enumeration). */
export async function authenticate(email: string, password: string): Promise<User | null> {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || user.status === "DELETED") {
    await verifyPassword(password, await getDummyHash()); // equalise timing
    return null;
  }
  return (await verifyPassword(password, user.passwordHash)) ? user : null;
}

export async function sendVerificationEmail(user: Pick<User, "id" | "email" | "name">): Promise<void> {
  const token = generateToken();
  await db.$transaction([
    // Only the newest verification link is valid.
    db.emailToken.updateMany({
      where: { userId: user.id, type: "VERIFY_EMAIL", usedAt: null },
      data: { usedAt: new Date() },
    }),
    db.emailToken.create({
      data: { userId: user.id, type: "VERIFY_EMAIL", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
    }),
  ]);
  await sendEmail({
    to: user.email,
    subject: t("email.verifySubject"),
    template: "verify_email",
    text: composeEmail({ name: user.name, body: t("email.verifyBody"), url: absoluteUrl(`/stadfesta-netfang?token=${token}`) }),
  });
}

/** Atomically marks a token used; returns its user id if it was valid. */
async function consumeToken(rawToken: string, type: "VERIFY_EMAIL" | "PASSWORD_RESET"): Promise<string | null> {
  if (!rawToken || rawToken.length > 100) return null;
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const res = await db.emailToken.updateMany({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (res.count !== 1) return null;
  const row = await db.emailToken.findUnique({ where: { tokenHash }, select: { userId: true } });
  return row?.userId ?? null;
}

export async function verifyEmail(rawToken: string): Promise<{ userId: string; submittedDrafts: number } | null> {
  const userId = await consumeToken(rawToken, "VERIFY_EMAIL");
  if (!userId) return null;
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  const submittedDrafts = await submitDraftsForUser(userId);
  return { userId, submittedDrafts };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || user.status !== "ACTIVE") return; // same response either way
  const token = generateToken();
  await db.emailToken.create({
    data: { userId: user.id, type: "PASSWORD_RESET", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  await sendEmail({
    to: user.email,
    subject: t("email.resetSubject"),
    template: "password_reset",
    text: composeEmail({ name: user.name, body: t("email.resetBody"), url: absoluteUrl(`/endurstilla-lykilord?token=${token}`) }),
  });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<boolean> {
  const userId = await consumeToken(rawToken, "PASSWORD_RESET");
  if (!userId) return false;
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } }),
    // Changing the password signs the user out everywhere.
    db.session.deleteMany({ where: { userId } }),
    db.emailToken.updateMany({ where: { userId, type: "PASSWORD_RESET", usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  return true;
}
