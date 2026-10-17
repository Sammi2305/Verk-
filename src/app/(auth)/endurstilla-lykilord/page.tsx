import type { Metadata } from "next";
import { t } from "@/i18n";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "@/components/forms/auth-forms";
import { Alert } from "@/components/ui/primitives";

export const metadata: Metadata = { title: t("auth.resetTitle"), robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title={t("auth.resetTitle")}>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert tone="danger" title={t("auth.verifyInvalidTitle")}>
          {t("auth.verifyInvalid")}
        </Alert>
      )}
    </AuthShell>
  );
}
