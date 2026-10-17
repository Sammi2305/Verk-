import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDateTime, formatPhone } from "@/lib/format";
import { reviewProfileAction, reviewQualificationAction, verifyEmailAction } from "../../actions";
import { Alert, Badge, Card, CardSection, DetailRow, SectionTitle } from "@/components/ui/primitives";
import { ProfileStatusBadge } from "@/components/status";
import { DecisionForm } from "@/components/forms/admin-forms";
import { ArrowLeftIcon } from "@/components/ui/icons";

export default async function AdminProfileReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/stjornbord/fagadilar/${id}`);
  const p = await db.tradespersonProfile.findUnique({
    where: { id },
    include: {
      user: true,
      categories: { include: { category: true } },
      areas: { include: { area: true } },
      qualifications: { orderBy: { createdAt: "asc" }, include: { category: true, verifiedBy: { select: { name: true } } } },
      reviewedBy: { select: { name: true } },
    },
  });
  if (!p) notFound();
  const verTone = { PENDING: "warning", VERIFIED: "success", REJECTED: "danger" } as const;

  return (
    <div className="space-y-6">
      <Link href="/stjornbord/fagadilar" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeftIcon className="size-4" /> {t("admin.profiles")}
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardSection>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold break-words">{p.businessName}</h2>
                <ProfileStatusBadge status={p.status} />
              </div>
              <dl className="mt-4 divide-y divide-line">
                <DetailRow label={t("admin.contact")}>
                  {p.user.name} · {p.user.email}
                  {p.user.phone ? ` · ${formatPhone(p.user.phone)}` : ""}
                  <span className="mt-1 block">
                    {p.user.emailVerifiedAt ? <Badge tone="success">{t("admin.emailVerified")}</Badge> : <Badge tone="warning">{t("admin.emailUnverified")}</Badge>}
                  </span>
                </DetailRow>
                <DetailRow label={t("pro.companyId")}>{p.companyId ?? "—"}</DetailRow>
                <DetailRow label={t("pro.publicPhone")}>{p.publicPhone ? formatPhone(p.publicPhone) : "—"}</DetailRow>
                <DetailRow label={t("pro.yearsExperience")}>{p.yearsExperience ?? "—"}</DetailRow>
                <DetailRow label={t("pro.categories")}>{p.categories.map((c) => c.category.nameIs).join(", ") || "—"}</DetailRow>
                <DetailRow label={t("pro.areas")}>{p.areas.map((a) => a.area.name).join(", ") || "—"}</DetailRow>
                <DetailRow label={t("pro.description")}>
                  <p className="whitespace-pre-line">{p.description || "—"}</p>
                </DetailRow>
                <DetailRow label={t("common.created")}>{formatDateTime(p.createdAt)}</DetailRow>
                {p.reviewedAt && (
                  <DetailRow label={t("admin.reviewNote")}>
                    {p.reviewNote ?? "—"}
                    <span className="block text-xs text-muted">
                      {p.reviewedBy?.name} · {formatDateTime(p.reviewedAt)}
                    </span>
                  </DetailRow>
                )}
              </dl>
            </CardSection>
          </Card>

          <Card>
            <CardSection>
              <SectionTitle>{t("pro.qualificationsTitle")}</SectionTitle>
              {p.qualifications.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{t("pro.qualEmpty")}</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {p.qualifications.map((q) => (
                    <li key={q.id} className="rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{q.title}</p>
                          <p className="text-sm text-muted">
                            {t(`enums.qualificationType.${q.type}`)}
                            {q.category ? ` · ${q.category.nameIs}` : ""}
                            {q.issuer ? ` · ${q.issuer}` : ""}
                            {q.referenceNo ? ` · nr. ${q.referenceNo}` : ""}
                          </p>
                        </div>
                        <Badge tone={verTone[q.status]}>{t(`enums.verificationStatus.${q.status}`)}</Badge>
                      </div>
                      {q.adminNote && (
                        <p className="mt-2 text-sm text-ink-soft">
                          {q.adminNote}
                          {q.verifiedBy && <span className="text-muted"> — {q.verifiedBy.name}</span>}
                        </p>
                      )}
                      <div className="mt-3">
                        <DecisionForm
                          action={reviewQualificationAction}
                          hidden={{ qualificationId: q.id, profileId: p.id }}
                          noteLabel={t("admin.verificationNote")}
                          buttons={[
                            ...(q.status !== "VERIFIED" ? [{ value: "VERIFIED", label: t("admin.verify"), variant: "primary" as const }] : []),
                            ...(q.status !== "REJECTED" ? [{ value: "REJECTED", label: t("admin.unverify") }] : []),
                          ]}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardSection>
          </Card>
        </div>

        <Card className="self-start">
          <CardSection className="space-y-4">
            <SectionTitle>{t("admin.reviewTitle")}</SectionTitle>
            {!p.user.emailVerifiedAt && (
              <>
                <Alert tone="warning">{t("admin.cannotApproveUnverified")}</Alert>
                <DecisionForm
                  action={verifyEmailAction}
                  hidden={{ userId: p.user.id }}
                  buttonName="confirm"
                  noteLabel={t("admin.verifyEmailNote")}
                  buttons={[{ value: "1", label: t("admin.verifyEmail") }]}
                />
              </>
            )}
            {p.status === "APPROVED" && (
              <Link href={`/fagfolk/${p.slug}`} className="block text-sm font-medium text-brand-700 hover:underline">
                {t("pro.viewPublic")} →
              </Link>
            )}
            <DecisionForm
              action={reviewProfileAction}
              hidden={{ profileId: p.id }}
              noteLabel={t("admin.reviewNote")}
              notePlaceholder={t("admin.reviewNoteHint")}
              buttons={[
                ...(p.status !== "APPROVED" ? [{ value: "APPROVED", label: t("admin.approve"), variant: "primary" as const }] : []),
                ...(p.status === "PENDING_REVIEW" ? [{ value: "REJECTED", label: t("admin.reject") }] : []),
                ...(p.status === "APPROVED" ? [{ value: "SUSPENDED", label: t("admin.suspend"), variant: "danger" as const }] : []),
              ]}
            />
          </CardSection>
        </Card>
      </div>
    </div>
  );
}
