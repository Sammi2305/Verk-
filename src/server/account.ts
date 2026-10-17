import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { t } from "@/i18n";
import { UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/tokens";
import { removeImage } from "@/lib/storage";
import { nameSchema, optionalPhoneSchema } from "@/lib/validation";
import { cancelJobRequest } from "./job-requests";

export const accountSchema = z.object({
  name: nameSchema,
  phone: optionalPhoneSchema,
  emailNotifications: z.enum(["on"]).optional(),
});

export async function updateAccount(userId: string, input: z.infer<typeof accountSchema>) {
  await db.user.update({
    where: { id: userId },
    data: { name: input.name, phone: input.phone, emailNotifications: input.emailNotifications === "on" },
  });
}

const OPEN_BOOKING = ["ACCEPTED", "SCHEDULED", "IN_PROGRESS", "DISPUTED"] as const;

/**
 * Deletes an account by removing personal data. Completed bookings and charges
 * are kept (accounting obligations) but no longer identify the person.
 */
export async function deleteAccount(userId: string, password: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { tradesperson: true } });
  if (!(await verifyPassword(password, user.passwordHash))) throw new UserError(t("errors.wrongPassword"), { password: t("errors.wrongPassword") });
  if (user.role === "ADMIN") throw new UserError(t("errors.forbidden"));

  const openBookings = await db.booking.count({
    where: {
      status: { in: [...OPEN_BOOKING] },
      OR: [{ customerId: userId }, ...(user.tradesperson ? [{ profileId: user.tradesperson.id }] : [])],
    },
  });
  if (openBookings > 0) throw new UserError(t("errors.activeBookings"));

  // Withdraw open requests so tradespeople are told.
  const open = await db.jobRequest.findMany({ where: { customerId: userId, status: { in: ["DRAFT", "SUBMITTED"] } }, select: { id: true } });
  for (const r of open) await cancelJobRequest(userId, r.id);

  const uploads = await db.upload.findMany({ where: { ownerId: userId }, select: { id: true, storageKey: true } });

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `eytt+${userId}@deleted.invalid`,
        name: "Eyddur notandi",
        phone: null,
        passwordHash: await hashPassword(generateToken()),
        status: "DELETED",
        deletedAt: new Date(),
        emailNotifications: false,
      },
    });
    await tx.jobRequest.updateMany({ where: { customerId: userId }, data: { addressLine: "[eytt]", description: "[eytt]" } });
    await tx.message.updateMany({ where: { senderId: userId }, data: { body: "[eytt]" } });
    await tx.upload.deleteMany({ where: { ownerId: userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.emailToken.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    if (user.tradesperson) {
      await tx.tradespersonProfile.update({
        where: { id: user.tradesperson.id },
        data: { status: "SUSPENDED", acceptingRequests: false, description: "", publicPhone: null, companyId: null },
      });
      await tx.qualification.updateMany({ where: { profileId: user.tradesperson.id }, data: { referenceNo: null } });
    }
    await audit({ actorId: userId, action: "account.delete", entityType: "User", entityId: userId }, tx);
  });
  await Promise.all(uploads.map((u) => removeImage(u.storageKey)));
}
