import type { Metadata } from "next";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { devOutboxEnabled } from "@/lib/env";
import { Container } from "@/components/ui/primitives";
import { SubNav } from "@/components/layout/sub-nav";

export const metadata: Metadata = { title: t("admin.title"), robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("/stjornbord");
  const [pending, disputes] = await Promise.all([
    db.tradespersonProfile.count({ where: { status: "PENDING_REVIEW" } }),
    db.dispute.count({ where: { status: "OPEN" } }),
  ]);
  return (
    <Container className="py-8 sm:py-12">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">{t("admin.title")}</h1>
      <SubNav
        label={t("admin.title")}
        items={[
          { href: "/stjornbord", label: t("admin.overview"), exact: true },
          { href: "/stjornbord/fagadilar", label: t("admin.profiles"), badge: pending },
          { href: "/stjornbord/bokanir", label: t("admin.bookings"), badge: disputes },
          { href: "/stjornbord/gjold", label: t("admin.charges") },
          { href: "/stjornbord/flokkar", label: t("admin.categories") },
          { href: "/stjornbord/notendur", label: t("admin.users") },
          { href: "/stjornbord/stillingar", label: t("admin.settings") },
          { href: "/stjornbord/atvikaskra", label: t("admin.audit") },
          ...(devOutboxEnabled() ? [{ href: "/dev/postholf", label: t("admin.outbox") }] : []),
        ]}
      />
      {children}
    </Container>
  );
}
