import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { t } from "@/i18n";
import { env } from "@/lib/env";
import { formatDate, formatPhone } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth/session";
import { getProfileForPreview, getPublicProfile } from "@/server/tradespeople";
import { Alert, Badge, Card, CardSection, Container, SectionTitle } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/profile-card";
import { BadgeCheckIcon, MapPinIcon, PauseIcon, PhoneIcon, ShieldCheckIcon } from "@/components/ui/icons";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicProfile(slug);
  if (!p) return { robots: { index: false } };
  return {
    title: `${p.businessName} — ${p.categories.map((c) => c.category.nameIs).join(", ")}`,
    description: p.description.slice(0, 160) || undefined,
    alternates: { canonical: `/fagfolk/${slug}` },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { slug } = await params;
  const viewer = await getCurrentUser();
  const p = await getProfileForPreview(slug, viewer?.id);
  if (!p) notFound();
  const isPreview = p.status !== "APPROVED";
  const firstCategory = p.categories[0]?.category.slug;
  const requestHref = `/verkbeidni/ny?fagadili=${p.slug}${firstCategory ? `&flokkur=${firstCategory}` : ""}`;

  // Structured data built only from verified, real profile fields.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: p.businessName,
    url: `${env().APP_URL}/fagfolk/${p.slug}`,
    description: p.description || undefined,
    telephone: p.publicPhone ? `+354${p.publicPhone}` : undefined,
    areaServed: p.areas.map((a) => ({ "@type": "City", name: a.area.name })),
  };

  return (
    <Container className="py-10 sm:py-14">
      {!isPreview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      {isPreview && (
        <Alert tone="warning" className="mb-6">
          {t("profile.previewNotice")}
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardSection className="sm:p-8">
              <div className="flex items-start gap-4">
                <Avatar name={p.businessName} size="lg" />
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">{p.businessName}</h1>
                  <p className="mt-1 text-muted">{p.categories.map((c) => c.category.nameIs).join(" · ")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.status === "APPROVED" && (
                      <Badge tone="brand">
                        <ShieldCheckIcon className="size-3.5" /> {t("profile.reviewedBadge")}
                      </Badge>
                    )}
                    {p.qualifications.length > 0 && (
                      <Badge tone="success" title={t("profile.verifiedBadgeTitle")}>
                        <BadgeCheckIcon className="size-3.5" /> {t("profile.verifiedBadge")}
                      </Badge>
                    )}
                    {p.yearsExperience !== null && <Badge>{t("profile.yearsExperience", { years: p.yearsExperience })}</Badge>}
                  </div>
                </div>
              </div>
            </CardSection>
          </Card>

          {p.description && (
            <Card>
              <CardSection>
                <SectionTitle>{t("profile.about")}</SectionTitle>
                <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-soft">{p.description}</p>
              </CardSection>
            </Card>
          )}

          <Card>
            <CardSection>
              <SectionTitle>{t("profile.qualifications")}</SectionTitle>
              {p.qualifications.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{t("profile.noVerifiedQualifications")}</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {p.qualifications.map((q) => (
                    <li key={q.id} className="flex gap-3">
                      <BadgeCheckIcon className="mt-0.5 size-5 shrink-0 text-success-700" />
                      <div>
                        <p className="font-medium">{q.title}</p>
                        <p className="text-sm text-muted">
                          {t(`enums.qualificationType.${q.type}`)}
                          {q.issuer ? ` · ${t("profile.issuer")}: ${q.issuer}` : ""}
                          {q.category ? ` · ${q.category.nameIs}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardSection>
          </Card>

          <Card>
            <CardSection>
              <p className="text-sm text-muted">{t("profile.reviewsComing")}</p>
            </CardSection>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardSection className="space-y-4">
              {p.acceptingRequests ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-medium text-success-700">
                    <span className="size-2 rounded-full bg-success-500" aria-hidden /> {t("profile.accepting")}
                  </p>
                  {!isPreview && (
                    <ButtonLink href={requestHref} className="w-full" size="lg">
                      {t("profile.sendRequest")}
                    </ButtonLink>
                  )}
                </>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <PauseIcon className="size-4" /> {t("profile.pausedNotice")}
                </p>
              )}
              {p.publicPhone && (
                <p className="flex items-center gap-2 text-sm">
                  <PhoneIcon className="size-4 text-muted" />
                  <span className="text-muted">{t("profile.phone")}:</span>
                  <a href={`tel:+354${p.publicPhone}`} className="font-medium text-ink hover:underline">
                    {formatPhone(p.publicPhone)}
                  </a>
                </p>
              )}
            </CardSection>
          </Card>
          <Card>
            <CardSection className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold">{t("profile.services")}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.categories.map((c) => (
                    <Badge key={c.categoryId}>{c.category.nameIs}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold">{t("profile.areas")}</h2>
                <p className="mt-2 flex gap-1.5 text-sm text-ink-soft">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted" />
                  {p.areas.map((a) => a.area.name).join(", ")}
                </p>
              </div>
              {p.approvedAt && <p className="text-xs text-muted">{t("profile.memberSince", { date: formatDate(p.approvedAt) })}</p>}
            </CardSection>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
