import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { t } from "@/i18n";

export type EmailMessage = { to: string; subject: string; text: string; template: string };

/**
 * Sends a transactional e-mail through the configured driver.
 *
 * The only driver today is "outbox": the message is stored in `email_outbox`
 * flagged as a TEST message and is NOT delivered to anyone. A real provider
 * must be added deliberately and approved before customers get real e-mail
 * (see docs/OPERATIONS.md → "E-mail").
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const driver = env().MAIL_DRIVER;
  if (driver === "outbox") {
    await db.emailOutbox.create({
      data: {
        toEmail: message.to,
        subject: `[PRÓFUN] ${message.subject}`,
        textBody: message.text,
        template: message.template,
        status: "TEST_CAPTURED",
        isTest: true,
      },
    });
    if (env().NODE_ENV === "development") {
      console.info(`[mail:test] to=${message.to} subject="${message.subject}" (not delivered)`);
    }
    return;
  }
  throw new Error(`Unsupported MAIL_DRIVER: ${driver}`);
}

export function absoluteUrl(path: string): string {
  return new URL(path, env().APP_URL).toString();
}

/** Composes a plain-text e-mail with greeting, body, optional link and footer. */
export function composeEmail(opts: { name: string; body: string; url?: string }): string {
  return [
    t("email.greeting", { name: opts.name }),
    "",
    opts.body,
    ...(opts.url ? ["", t("email.openLink", { url: opts.url })] : []),
    "",
    t("email.signoff"),
    "",
    "—",
    t("email.footer"),
  ].join("\n");
}
