import type { Metadata } from "next";
import { t } from "@/i18n";
import { privacyIs } from "@/i18n/content/legal-is";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: t("legal.privacyTitle"), alternates: { canonical: "/personuvernd" } };

export default function PrivacyPage() {
  return <LegalPage title={t("legal.privacyTitle")} doc={privacyIs} />;
}
