import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { todayInIceland } from "@/lib/format";
import { getSettings } from "@/server/settings";
import { uploadsEnabled } from "@/lib/runtime-config";
import { JobRequestForm } from "@/components/forms/job-request-form";
import { Card, CardSection, PageHeader } from "@/components/ui/primitives";
import { UnverifiedBanner } from "@/components/unverified-banner";

export const metadata: Metadata = { title: t("request.newTitle"), robots: { index: false } };

type SP = { flokkur?: string; svaedi?: string; fagadili?: string };

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  const user = await requireUser(`/verkbeidni/ny${qs ? `?${qs}` : ""}`);
  if (user.role !== "CUSTOMER") notFound();

  const [categories, areas, settings, pro] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.area.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
    sp.fagadili ? db.tradespersonProfile.findUnique({ where: { slug: sp.fagadili }, include: { areas: true } }) : null,
  ]);
  const category = categories.find((c) => c.slug === sp.flokkur);
  // If the customer came from a profile, default to one of its areas.
  const area = areas.find((a) => a.slug === sp.svaedi) ?? (pro?.areas.length === 1 ? areas.find((a) => a.id === pro.areas[0].areaId) : undefined);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader title={t("request.newTitle")} description={t("request.newIntro")} />
      {!user.emailVerified && <UnverifiedBanner />}
      <Card>
        <CardSection className="sm:p-8">
          <JobRequestForm
            categories={categories}
            areas={areas}
            maxInvites={settings.maxInvitesPerRequest}
            minDate={todayInIceland()}
            photosEnabled={uploadsEnabled()}
            defaults={{ categoryId: category?.id, areaId: area?.id, preselectSlug: pro?.slug }}
          />
        </CardSection>
      </Card>
    </div>
  );
}
