import type { Metadata } from "next";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireTradesperson } from "@/lib/auth/guards";
import { Container } from "@/components/ui/primitives";
import { SubNav } from "@/components/layout/sub-nav";
import { UnverifiedBanner } from "@/components/unverified-banner";

export const metadata: Metadata = { title: t("pro.title"), robots: { index: false } };

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireTradesperson("/fagadili");
  const newCount = await db.jobInvitation.count({ where: { profileId: profile.id, status: "PENDING", jobRequest: { status: "SUBMITTED" } } });
  return (
    <Container className="py-8 sm:py-12">
      <p className="mb-1 text-sm text-muted">{t("pro.title")}</p>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight break-words sm:text-3xl">{profile.businessName}</h1>
      <SubNav
        label={t("pro.title")}
        items={[
          { href: "/fagadili", label: t("pro.overview"), exact: true },
          { href: "/fagadili/beidnir", label: t("pro.requests"), badge: newCount },
          { href: "/fagadili/bokanir", label: t("pro.bookings") },
          { href: "/fagadili/profill", label: t("pro.profile") },
          { href: "/fagadili/gjold", label: t("pro.billing") },
        ]}
      />
      {!user.emailVerified && <UnverifiedBanner />}
      {children}
    </Container>
  );
}
