import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { PricingPlans } from "@/components/pricing-plans";

export const metadata: Metadata = { title: t("pricing.title"), description: t("pricing.intro"), alternates: { canonical: "/verdskra" } };

export default function PricingPage() {
  return (
    <Container className="max-w-4xl py-10 sm:py-14">
      <PageHeader title={t("pricing.title")} description={t("pricing.intro")} actions={<ButtonLink href="/nyskraning/fagadili">{t("home.prosCta")}</ButtonLink>} />
      <PricingPlans />
    </Container>
  );
}
