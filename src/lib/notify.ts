import "server-only";
import { db } from "@/lib/db";
import { absoluteUrl, composeEmail, sendEmail } from "@/lib/mail";

export type NotificationInput = { type: string; title: string; body?: string; href?: string };

/**
 * Creates an in-app notification and, if the user allows it, an e-mail.
 * Notification failures are logged and never break the business action that
 * triggered them (the in-app notification row is the source of truth).
 */
export async function notify(userId: string, n: NotificationInput): Promise<void> {
  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE") return;
    await db.notification.create({
      data: { userId, type: n.type, title: n.title, body: n.body ?? "", href: n.href },
    });
    if (user.emailNotifications && user.emailVerifiedAt) {
      await sendEmail({
        to: user.email,
        subject: n.title,
        template: n.type,
        text: composeEmail({ name: user.name, body: n.body ?? n.title, url: n.href ? absoluteUrl(n.href) : undefined }),
      });
    }
  } catch (err) {
    console.error("[notify] failed", { userId, type: n.type, err });
  }
}

export async function notifyAdmins(n: NotificationInput): Promise<void> {
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  await Promise.all(admins.map((a) => notify(a.id, n)));
}
