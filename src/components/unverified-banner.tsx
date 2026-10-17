import { t } from "@/i18n";
import { devOutboxEnabled, emailDeliveryLive } from "@/lib/env";
import { Alert } from "@/components/ui/primitives";
import { ResendVerificationForm } from "@/components/forms/auth-forms";
import { EmailModeNotice } from "@/components/email-mode-notice";

export function UnverifiedBanner() {
  // "Send again" only makes sense if a message can actually be read somewhere.
  const canResend = emailDeliveryLive() || devOutboxEnabled();
  return (
    <div className="mb-6">
      <Alert tone="warning" action={canResend ? <ResendVerificationForm compact /> : undefined}>
        {t("auth.unverifiedBanner")}
      </Alert>
      <EmailModeNotice />
    </div>
  );
}
