import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/i18n";
import { requireUser } from "@/lib/auth/guards";
import { formatDateTime, formatTimeRange } from "@/lib/format";
import { getRequestForCustomer } from "@/server/job-requests";
import { cancelRequestAction, confirmBookingAction } from "../../actions";
import { Alert, Card, CardSection, Container, DetailRow, SectionTitle } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { InvitationStatusBadge, PriceText, RequestStatusBadge } from "@/components/status";
import { RequestSummary } from "@/components/request-summary";
import { PhotoGrid } from "@/components/photo-grid";
import { ActionForm } from "@/components/forms/action-form";
import { Avatar } from "@/components/profile-card";
import { ArrowLeftIcon, InfoIcon } from "@/components/ui/icons";

export default async function CustomerRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ny?: string }> }) {
  const { id } = await params;
  const { ny } = await searchParams;
  const user = await requireUser(`/minar-sidur/beidnir/${id}`);
  const req = await getRequestForCustomer(id, user.id);
  if (!req) notFound();

  const accepted = req.invitations.filter((i) => i.status === "ACCEPTED");
  const others = req.invitations.filter((i) => i.status !== "ACCEPTED");
  const ordered = [...accepted, ...others];
  const open = req.status === "SUBMITTED";

  return (
    <Container className="max-w-4xl py-8 sm:py-12">
      <Link href="/minar-sidur" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeftIcon className="size-4" /> {t("dashboard.title")}
      </Link>

      {ny === "1" && req.status === "SUBMITTED" && (
        <Alert tone="success" title={t("request.sentTitle")} className="mb-6">
          {t("request.sentText")}
        </Alert>
      )}
      {req.status === "DRAFT" && (
        <Alert tone="warning" title={t("request.savedDraftTitle")} className="mb-6">
          {t("request.draftNotice")}
        </Alert>
      )}
      {req.status === "BOOKED" && req.booking && (
        <Alert tone="success" className="mb-6" action={<ButtonLink href={`/bokanir/${req.booking.id}`}>{t("request.viewBooking")}</ButtonLink>}>
          {t("request.booked")}
        </Alert>
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            {t("request.detailTitle")} · {formatDateTime(req.createdAt)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight break-words">{req.title}</h1>
        </div>
        <RequestStatusBadge status={req.status} />
      </div>

      <section className="space-y-4" aria-labelledby="responses">
        <SectionTitle>
          <span id="responses">{t("request.responses")}</span>
        </SectionTitle>
        {open && accepted.length === 0 && <Alert tone="neutral">{t("request.responsesEmpty")}</Alert>}
        <ul className="space-y-3">
          {ordered.map((inv) => (
            <li key={inv.id}>
              <Card className={inv.status === "ACCEPTED" ? "ring-1 ring-brand-200" : ""}>
                <CardSection>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={inv.profile.businessName} />
                      <div className="min-w-0">
                        <Link href={`/fagfolk/${inv.profile.slug}`} className="font-semibold break-words hover:underline">
                          {inv.profile.businessName}
                        </Link>
                        {inv.status === "PENDING" && <p className="text-sm text-muted">{t("request.awaiting")}</p>}
                        {inv.status === "DECLINED" && (
                          <p className="text-sm text-muted">
                            {t("request.declined")}
                            {inv.declineReason ? `: ${inv.declineReason}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <InvitationStatusBadge status={inv.status} audience="customer" />
                  </div>

                  {inv.priceType && (inv.status === "ACCEPTED" || inv.status === "SELECTED" || inv.status === "NOT_SELECTED") && (
                    <dl className="mt-4 divide-y divide-line border-t border-line">
                      <DetailRow label={inv.status === "SELECTED" ? t("booking.agreedPrice") : t("request.price")}>
                        <span className="font-semibold">
                          <PriceText type={inv.priceType} amount={inv.priceAmountIsk} />
                        </span>
                      </DetailRow>
                      {inv.priceNote && <DetailRow label={t("request.priceNote")}>{inv.priceNote}</DetailRow>}
                      <DetailRow label={t("request.proposedTime")}>
                        {inv.proposedStart && inv.proposedEnd ? formatTimeRange(inv.proposedStart, inv.proposedEnd) : t("request.noProposedTime")}
                      </DetailRow>
                      {inv.message && (
                        <DetailRow label={t("request.messageFromPro")}>
                          <p className="whitespace-pre-line">{inv.message}</p>
                        </DetailRow>
                      )}
                    </dl>
                  )}

                  {inv.status === "ACCEPTED" && open && (
                    <ActionForm action={confirmBookingAction} hidden={{ invitationId: inv.id }} className="mt-4 space-y-3 rounded-xl bg-subtle p-4">
                      <p className="text-sm text-ink-soft">{t("request.bookConfirmText", { name: inv.profile.businessName })}</p>
                      <SubmitButton pendingText={t("common.sending")}>{t("request.book", { name: inv.profile.businessName })}</SubmitButton>
                    </ActionForm>
                  )}
                </CardSection>
              </Card>
            </li>
          ))}
        </ul>
        {accepted.length > 0 && (
          <p className="flex gap-2 text-sm text-muted">
            <InfoIcon className="mt-0.5 size-4 shrink-0" /> {t("request.pricesFromPro")}
          </p>
        )}
      </section>

      <Card className="mt-10">
        <CardSection>
          <SectionTitle>{t("common.details")}</SectionTitle>
          <div className="mt-2">
            <RequestSummary request={req} address={req.addressLine} />
          </div>
          {req.photos.length > 0 && (
            <div className="mt-6">
              <PhotoGrid photos={req.photos} />
            </div>
          )}
        </CardSection>
      </Card>

      {(req.status === "SUBMITTED" || req.status === "DRAFT") && (
        <details className="mt-6 rounded-xl border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink-soft hover:text-ink">{t("request.cancelRequest")}</summary>
          <ActionForm action={cancelRequestAction} hidden={{ jobRequestId: req.id }} className="space-y-3 border-t border-line p-4">
            <p className="text-sm text-muted">{t("request.cancelRequestConfirm")}</p>
            <SubmitButton variant="danger" pendingText={t("common.sending")}>
              {t("request.cancelRequest")}
            </SubmitButton>
          </ActionForm>
        </details>
      )}
    </Container>
  );
}
