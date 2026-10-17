import { t } from "@/i18n";
import { Alert } from "@/components/ui/primitives";
import { ResendVerificationForm } from "@/components/forms/auth-forms";
import { DevOutboxNotice } from "@/components/dev-outbox-notice";

export function UnverifiedBanner() {
  return (
    <div className="mb-6">
      <Alert tone="warning" action={<ResendVerificationForm compact />}>
        {t("auth.unverifiedBanner")}
      </Alert>
      <DevOutboxNotice />
    </div>
  );
}
