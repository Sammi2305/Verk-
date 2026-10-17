import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireTradesperson } from "@/lib/auth/guards";
import { removeQualificationAction } from "../actions";
import { ProfileForm, QualificationForm } from "@/components/forms/pro-forms";
import { Badge, Card, CardSection, SectionTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ProfileStatusAlert } from "@/components/pro-status";
import { ProfileStatusBadge } from "@/components/status";

export default async function ProProfilePage() {
  const { profile } = await requireTradesperson("/fagadili/profill");
  const [full, categories, areas] = await Promise.all([
    db.tradespersonProfile.findUniqueOrThrow({
      where: { id: profile.id },
      include: { categories: true, areas: true, qualifications: { orderBy: { createdAt: "asc" }, include: { category: true } } },
    }),
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.area.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const verTone = { PENDING: "warning", VERIFIED: "success", REJECTED: "danger" } as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <ProfileStatusAlert profile={profile} />
        <Card>
          <CardSection className="sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <SectionTitle>{t("pro.profileTitle")}</SectionTitle>
              <ProfileStatusBadge status={profile.status} />
            </div>
            <ProfileForm
              categories={categories}
              areas={areas}
              profile={{
                businessName: full.businessName,
                description: full.description,
                publicPhone: full.publicPhone,
                yearsExperience: full.yearsExperience,
                categoryIds: full.categories.map((c) => c.categoryId),
                areaIds: full.areas.map((a) => a.areaId),
                canSubmit: profile.status === "DRAFT" || profile.status === "REJECTED",
              }}
            />
            {profile.status === "APPROVED" && <p className="mt-4 text-sm text-muted">{t("pro.resubmitHint")}</p>}
          </CardSection>
        </Card>
      </div>

      <Card className="self-start">
        <CardSection>
          <SectionTitle>{t("pro.qualificationsTitle")}</SectionTitle>
          <p className="mt-1.5 text-sm text-muted">{t("pro.qualificationsIntro")}</p>
          {full.qualifications.length === 0 ? (
            <p className="mt-5 text-sm text-muted">{t("pro.qualEmpty")}</p>
          ) : (
            <ul className="mt-5 divide-y divide-line">
              {full.qualifications.map((q) => (
                <li key={q.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{q.title}</p>
                    <p className="text-sm text-muted">
                      {t(`enums.qualificationType.${q.type}`)}
                      {q.category ? ` · ${q.category.nameIs}` : ""}
                    </p>
                    <Badge tone={verTone[q.status]} className="mt-1.5">
                      {t(`enums.verificationStatus.${q.status}`)}
                    </Badge>
                  </div>
                  {q.status !== "VERIFIED" && (
                    <form action={removeQualificationAction}>
                      <input type="hidden" name="id" value={q.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        {t("pro.qualRemove")}
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 border-t border-line pt-6">
            <QualificationForm categories={categories} />
          </div>
        </CardSection>
      </Card>
    </div>
  );
}
