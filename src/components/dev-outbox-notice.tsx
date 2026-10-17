import Link from "next/link";
import { t } from "@/i18n";
import { devOutboxEnabled } from "@/lib/env";
import { Alert } from "@/components/ui/primitives";

/** Development only: explains that e-mails are captured, not delivered. */
export function DevOutboxNotice() {
  if (!devOutboxEnabled()) return null;
  return (
    <Alert tone="warning" title={t("common.testMode")} className="mt-5">
      {t("auth.devOutboxNotice")} <Link href="/dev/postholf">{t("auth.devOutboxLink")}</Link>
    </Alert>
  );
}
