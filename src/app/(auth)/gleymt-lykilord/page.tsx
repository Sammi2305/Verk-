import type { Metadata } from "next";
import { t } from "@/i18n";
import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "@/components/forms/auth-forms";
import { DevOutboxNotice } from "@/components/dev-outbox-notice";

export const metadata: Metadata = { title: t("auth.forgotTitle"), robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title={t("auth.forgotTitle")} intro={t("auth.forgotIntro")}>
      <ForgotPasswordForm />
      <DevOutboxNotice />
    </AuthShell>
  );
}
