import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { PricingPlans } from "@/components/pricing-plans";
import { BadgeCheckIcon, CalendarIcon, ChatIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: t("home.prosTitle"), description: t("home.prosText"), alternates: { canonical: "/fyrir-fagfolk" } };

export default function ForProsPage() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="max-w-4xl py-14 sm:py-20">
          <p className="text-sm font-medium tracking-wide text-brand-700 uppercase">{t("home.prosEyebrow")}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t("home.prosTitle")}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">{t("home.prosText")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/nyskraning/fagadili" size="lg">
              {t("home.prosCta")}
            </ButtonLink>
          </div>
          <ul className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { icon: <ChatIcon />, title: t("pro.requests"), text: t("home.how2Text") },
              { icon: <CalendarIcon />, title: t("pro.bookings"), text: t("home.how3Text") },
              { icon: <BadgeCheckIcon />, title: t("home.trust2Title"), text: t("home.trust2Text") },
            ].map((f) => (
              <li key={f.title}>
                <span className="text-brand-600">{f.icon}</span>
                <h2 className="mt-2 font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <Container className="max-w-4xl py-14">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("pricing.title")}</h2>
        <PricingPlans />
      </Container>
    </>
  );
}
