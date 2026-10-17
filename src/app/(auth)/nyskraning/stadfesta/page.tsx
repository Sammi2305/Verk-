import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { requireUser, homeForRole } from "@/lib/auth/guards";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResendVerificationForm } from "@/components/forms/auth-forms";
import { DevOutboxNotice } from "@/components/dev-outbox-notice";
import { MailIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: t("auth.checkEmailTitle"), robots: { index: false } };

export default async function CheckEmailPage() {
  const user = await requireUser("/nyskraning/stadfesta");
  if (user.emailVerified) redirect(homeForRole(user.role));
  return (
    <AuthShell title={t("auth.checkEmailTitle")}>
      <div className="mb-5 grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <MailIcon />
      </div>
      <p className="text-[0.95rem] text-ink-soft">{t("auth.checkEmailText", { email: user.email })}</p>
      <p className="mt-3 text-sm text-muted">{t("auth.checkEmailHint")}</p>
      <div className="mt-6">
        <ResendVerificationForm />
      </div>
      <DevOutboxNotice />
    </AuthShell>
  );
}
