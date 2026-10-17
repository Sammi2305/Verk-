import type { Metadata } from "next";
import { t } from "@/i18n";
import { termsIs } from "@/i18n/content/legal-is";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: t("legal.termsTitle"), alternates: { canonical: "/skilmalar" } };

export default function TermsPage() {
  return <LegalPage title={t("legal.termsTitle")} doc={termsIs} />;
}
