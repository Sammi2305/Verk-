import Link from "next/link";
import { t } from "@/i18n";
import { devOutboxEnabled, emailDeliveryLive } from "@/lib/env";
import { Alert } from "@/components/ui/primitives";

/**
 * Tells the user honestly that e-mail is not being delivered:
 * - development: link to the local test mailbox;
 * - a deployed site without an e-mail provider: an admin verifies by hand.
 */
export function EmailModeNotice() {
  if (devOutboxEnabled()) {
    return (
      <Alert tone="warning" title={t("common.testMode")} className="mt-5">
        {t("auth.devOutboxNotice")} <Link href="/dev/postholf">{t("auth.devOutboxLink")}</Link>
      </Alert>
    );
  }
  if (!emailDeliveryLive()) {
    return (
      <Alert tone="info" title={t("auth.emailNotLiveTitle")} className="mt-5">
        {t("auth.emailNotLive")}
      </Alert>
    );
  }
  return null;
}
