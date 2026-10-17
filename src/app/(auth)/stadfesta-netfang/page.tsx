import type { Metadata } from "next";
import { t } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/guards";
import { AuthShell } from "@/components/layout/auth-shell";
import { VerifyEmailForm } from "@/components/forms/auth-forms";
import { Alert } from "@/components/ui/primitives";

export const metadata: Metadata = { title: t("auth.checkEmailTitle"), robots: { index: false } };

// Verification happens on an explicit POST (button), never on GET, so link
// scanners and prefetchers cannot consume the token.
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const user = await getCurrentUser();
  const continueHref = user ? homeForRole(user.role) : "/innskraning";
  return (
    <AuthShell title={t("auth.checkEmailTitle")}>
      {token ? (
        <VerifyEmailForm token={token} continueHref={continueHref} />
      ) : (
        <Alert tone="danger" title={t("auth.verifyInvalidTitle")}>
          {t("auth.verifyInvalid")}
        </Alert>
      )}
    </AuthShell>
  );
}
