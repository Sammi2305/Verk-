import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireTradesperson } from "@/lib/auth/guards";
import { formatDateTime, formatTimeRange, toIcelandLocalInput } from "@/lib/format";
import { getInvitationForPro, markInvitationSeen } from "@/server/job-requests";
import { getSettings, priceWithVatLabel } from "@/server/settings";
import { Alert, Card, CardSection, DetailRow, SectionTitle } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { InvitationStatusBadge, PriceText } from "@/components/status";
import { RequestSummary } from "@/components/request-summary";
import { PhotoGrid } from "@/components/photo-grid";
import { DeclineForm, RespondForm } from "@/components/forms/invitation-forms";
import { ArrowLeftIcon, LockIcon } from "@/components/ui/icons";

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireTradesperson(`/fagadili/beidnir/${id}`);
  const inv = await getInvitationForPro(id, profile.id);
  if (!inv || inv.jobRequest.status === "DRAFT") notFound();
  await markInvitationSeen(id, profile.id);

  const req = inv.jobRequest;
  const canRespond = inv.status === "PENDING" && req.status === "SUBMITTED";
  const [settings, subscription] = await Promise.all([
    getSettings(),
    db.subscription.findUnique({ where: { profileId: profile.id }, include: { plan: true } }),
  ]);
  const plan = subscription?.plan ?? (await db.plan.findUniqueOrThrow({ where: { code: "BASIC" } }));
  const fee = priceWithVatLabel(plan.perJobFeeIsk, settings.pricesIncludeVat);

  return (
    <div className="space-y-6">
      <Link href="/fagadili/beidnir" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeftIcon className="size-4" /> {t("pro.allRequests")}
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <Card>
          <CardSection className="sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted">
                  {t("invitation.title")} · {formatDateTime(inv.createdAt)} · {req.customer.name}
                </p>
                <h2 className="mt-1 text-xl font-semibold break-words">{req.title}</h2>
              </div>
              <InvitationStatusBadge status={inv.status} audience="pro" />
            </div>
            <div className="mt-6">
              <RequestSummary request={req} />
            </div>
            <p className="mt-4 flex items-start gap-2 text-sm text-muted">
              <LockIcon className="mt-0.5 size-4 shrink-0" /> {t("invitation.addressHidden")}
            </p>
            {req.photos.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold">{t("request.photosTitle")}</h3>
                <PhotoGrid photos={req.photos} />
              </div>
            )}
          </CardSection>
        </Card>

        <div className="space-y-4">
          {canRespond && (
            <Card>
              <CardSection>
                <SectionTitle>{t("invitation.respondTitle")}</SectionTitle>
                <p className="mt-1 mb-5 text-sm text-muted">{t("invitation.respondIntro")}</p>
                <RespondForm invitationId={inv.id} minDateTime={toIcelandLocalInput(new Date())} />
              </CardSection>
            </Card>
          )}
          {canRespond && <DeclineForm invitationId={inv.id} />}
          {canRespond && (
            <Alert tone="neutral">
              {plan.code === "PRO" || plan.perJobFeeIsk === 0
                ? t("invitation.feeNoticePro")
                : t("invitation.feeNoticeBasic", { fee: fee.amount, vat: fee.vat })}{" "}
              {!settings.billingEnabled && t("invitation.feeNoticeBillingOff")}
            </Alert>
          )}

          {inv.status === "ACCEPTED" && inv.priceType && (
            <Card>
              <CardSection>
                <SectionTitle>{t("invitation.yourResponse")}</SectionTitle>
                <dl className="mt-2 divide-y divide-line">
                  <DetailRow label={t("invitation.priceType")}>
                    <PriceText type={inv.priceType} amount={inv.priceAmountIsk} />
                  </DetailRow>
                  {inv.priceNote && <DetailRow label={t("request.priceNote")}>{inv.priceNote}</DetailRow>}
                  <DetailRow label={t("request.proposedTime")}>
                    {inv.proposedStart && inv.proposedEnd ? formatTimeRange(inv.proposedStart, inv.proposedEnd) : t("request.noProposedTime")}
                  </DetailRow>
                </dl>
                <p className="mt-3 text-sm text-muted">{t("invitation.responded")}</p>
              </CardSection>
            </Card>
          )}
          {inv.status === "DECLINED" && <Alert tone="neutral">{t("invitation.declined")}</Alert>}
          {inv.status === "NOT_SELECTED" && <Alert tone="neutral">{t("invitation.notSelected")}</Alert>}
          {inv.status === "SELECTED" && inv.booking && (
            <Alert tone="success" action={<ButtonLink href={`/bokanir/${inv.booking.id}`}>{t("request.viewBooking")}</ButtonLink>}>
              {t("notifications.bookedBody")}
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
