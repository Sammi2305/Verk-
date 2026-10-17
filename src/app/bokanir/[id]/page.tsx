import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { t } from "@/i18n";
import { requireUser } from "@/lib/auth/guards";
import { formatDateTime, formatIsk, formatPhone, formatTimeRange, toIcelandLocalInput } from "@/lib/format";
import { getBookingForViewer, markMessagesRead } from "@/server/bookings";
import { confirmCompletionAction, reportCompletionAction, startAction } from "../actions";
import { Alert, Badge, Card, CardSection, Container, DetailRow, SectionTitle } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { BookingStatusBadge, PriceText } from "@/components/status";
import { RequestSummary } from "@/components/request-summary";
import { PhotoGrid } from "@/components/photo-grid";
import { ActionForm } from "@/components/forms/action-form";
import { CancelBookingForm, DisputeForm, MessageForm, ScheduleForm } from "@/components/forms/booking-forms";
import { MailIcon, PhoneIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: t("booking.title"), robots: { index: false } };

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/bokanir/${id}`);
  const result = await getBookingForViewer(id, { id: user.id, role: user.role });
  if (!result) notFound();
  const { booking: b, party } = result;
  if (party !== "admin") await markMessagesRead(user.id, b.id);

  const title = b.jobRequest?.title ?? t("booking.title");
  const otherName = party === "customer" ? b.profile.businessName : b.customer.name;
  const isPro = party === "pro";
  const isCustomer = party === "customer";
  const cancellable = (isPro || isCustomer) && (b.status === "ACCEPTED" || b.status === "SCHEDULED");
  const reported = b.completionReportedAt !== null;
  const minInput = toIcelandLocalInput(new Date());
  const hidden = { bookingId: b.id };
  const nextStep =
    b.status === "ACCEPTED" || b.status === "SCHEDULED" || b.status === "IN_PROGRESS"
      ? isPro
        ? t(`booking.nextStepPro.${b.status}`)
        : isCustomer
          ? t(`booking.nextStepCustomer.${b.status}`)
          : null
      : null;

  // Contact details are shared only between the two parties of the booking.
  const proPhone = b.profile.publicPhone ?? b.profile.user.phone;

  return (
    <Container className="max-w-5xl py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            {t("booking.title")} · {t("booking.with", { name: otherName })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight break-words sm:text-3xl">{title}</h1>
        </div>
        <BookingStatusBadge status={b.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-6">
          {/* Status-specific guidance and actions */}
          {b.status === "COMPLETED" && <Alert tone="success">{t("booking.completedNotice")}</Alert>}
          {b.status === "CANCELLED" && (
            <Alert tone="neutral">
              {t("booking.cancelledNotice")}
              {b.cancelReason ? ` ${t("common.reason")}: ${b.cancelReason}` : ""}
            </Alert>
          )}
          {b.status === "DISPUTED" && (
            <Alert
              tone="danger"
              action={party === "admin" ? <ButtonLink href={`/stjornbord/bokanir/${b.id}`} size="sm">{t("admin.disputeResolveTitle")}</ButtonLink> : undefined}
            >
              {t("booking.disputeOpen")}
            </Alert>
          )}
          {nextStep && !(isCustomer && reported) && !(isPro && reported) && (
            <Alert tone="info" title={t("booking.nextStep")}>
              {nextStep}
            </Alert>
          )}

          {isCustomer && b.status === "IN_PROGRESS" && reported && (
            <Card className="ring-2 ring-brand-600">
              <CardSection className="space-y-4">
                <SectionTitle>{t("booking.confirmCompleteTitle")}</SectionTitle>
                <p className="text-sm text-ink-soft">{t("booking.confirmCompleteText", { name: b.profile.businessName })}</p>
                <ActionForm action={confirmCompletionAction} hidden={hidden}>
                  <SubmitButton size="lg" pendingText={t("common.sending")}>
                    {t("booking.confirmComplete")}
                  </SubmitButton>
                </ActionForm>
              </CardSection>
            </Card>
          )}

          {isPro && b.status === "IN_PROGRESS" && reported && <Alert tone="info">{t("booking.awaitingCustomerConfirmation")}</Alert>}

          {isPro && (b.status === "ACCEPTED" || b.status === "SCHEDULED") && (
            <Card>
              <CardSection>
                <SectionTitle>{t("booking.scheduleTitle")}</SectionTitle>
                <p className="mt-1 mb-4 text-sm text-muted">{t("booking.scheduleIntro")}</p>
                <ScheduleForm
                  bookingId={b.id}
                  min={minInput}
                  start={b.scheduledStart ? toIcelandLocalInput(b.scheduledStart) : ""}
                  end={b.scheduledEnd ? toIcelandLocalInput(b.scheduledEnd) : ""}
                  rescheduling={b.status === "SCHEDULED"}
                />
              </CardSection>
            </Card>
          )}

          {isPro && (b.status === "SCHEDULED" || (b.status === "IN_PROGRESS" && !reported)) && (
            <Card>
              <CardSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted">{b.status === "SCHEDULED" ? t("booking.startWorkHint") : t("booking.reportCompleteHint")}</p>
                <div className="flex flex-wrap gap-2">
                  {b.status === "SCHEDULED" && (
                    <ActionForm action={startAction} hidden={hidden} className="">
                      <SubmitButton variant="outline" pendingText={t("common.sending")}>
                        {t("booking.startWork")}
                      </SubmitButton>
                    </ActionForm>
                  )}
                  <ActionForm action={reportCompletionAction} hidden={hidden} className="">
                    <SubmitButton pendingText={t("common.sending")}>{t("booking.reportComplete")}</SubmitButton>
                  </ActionForm>
                </div>
              </CardSection>
            </Card>
          )}

          {b.status === "IN_PROGRESS" && (isCustomer || (isPro && reported)) && (
            <details className="rounded-xl border border-line bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink-soft hover:text-ink">{t("booking.openDispute")}</summary>
              <DisputeForm bookingId={b.id} />
            </details>
          )}

          {/* Messages */}
          <Card>
            <CardSection>
              <SectionTitle>{t("booking.messages")}</SectionTitle>
              {b.messages.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{t("booking.messagesEmpty")}</p>
              ) : (
                <ol className="mt-4 space-y-3" aria-live="polite">
                  {b.messages.map((m) => {
                    const mine = m.sender.id === user.id;
                    return (
                      <li key={m.id} className={mine ? "flex justify-end" : "flex"}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mine ? "bg-brand-600 text-white" : "bg-subtle text-ink"}`}>
                          <p className="text-sm whitespace-pre-line break-words">{m.body}</p>
                          <p className={`mt-1 text-xs ${mine ? "text-brand-100" : "text-muted"}`}>
                            {mine ? t("booking.you") : m.sender.name} · {formatDateTime(m.createdAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              {(isPro || isCustomer) && b.status !== "CANCELLED" && (
                <MessageForm bookingId={b.id} />
              )}
            </CardSection>
          </Card>

          <Card>
            <CardSection>
              <SectionTitle>{t("common.details")}</SectionTitle>
              {b.jobRequest && (
                <div className="mt-2">
                  {/* The booked tradesperson now sees the exact address. */}
                  <RequestSummary request={b.jobRequest} address={b.jobRequest.addressLine} />
                  {b.jobRequest.photos.length > 0 && (
                    <div className="mt-4">
                      <PhotoGrid photos={b.jobRequest.photos} />
                    </div>
                  )}
                </div>
              )}
            </CardSection>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardSection>
              <dl className="divide-y divide-line [&>div]:sm:grid-cols-1 [&>div]:sm:gap-0.5">
                <DetailRow label={t("booking.time")}>
                  {b.scheduledStart && b.scheduledEnd ? formatTimeRange(b.scheduledStart, b.scheduledEnd) : t("booking.timeNotSet")}
                </DetailRow>
                <DetailRow label={t("booking.agreedPrice")}>
                  <PriceText type={b.priceType} amount={b.priceAmountIsk} />
                  {b.priceNote && <span className="mt-0.5 block text-sm text-muted">{b.priceNote}</span>}
                </DetailRow>
                <DetailRow label={t("booking.contact")}>
                  {isCustomer || party === "admin" ? (
                    <ContactBlock name={b.profile.businessName} phone={proPhone} email={b.profile.user.email} />
                  ) : null}
                  {isPro || party === "admin" ? (
                    <ContactBlock name={b.customer.name} phone={b.customer.phone} email={b.customer.email} />
                  ) : null}
                </DetailRow>
                {(isPro || party === "admin") && <DetailRow label={t("booking.source")}>{t(`enums.bookingSource.${b.source}`)}</DetailRow>}
              </dl>
            </CardSection>
          </Card>

          {(isPro || party === "admin") && b.status === "COMPLETED" && (
            <Card>
              <CardSection>
                <h2 className="text-sm font-semibold">{t("booking.feeTitle")}</h2>
                <p className="mt-2 text-sm text-ink-soft">
                  {b.charge
                    ? t("booking.feeEligible", {
                        amount: formatIsk(b.charge.amountIsk),
                        vat: b.charge.amountIncludesVat ? t("common.vatIncluded") : t("common.vatExcluded"),
                        status: t(`enums.chargeStatus.${b.charge.status}`),
                      })
                    : t("booking.feeNotEligible", {
                        reason: b.feeReason && b.feeReason in feeReasons ? t(`booking.feeReason.${b.feeReason as keyof typeof feeReasons}`) : "—",
                      })}
                </p>
              </CardSection>
            </Card>
          )}

          {cancellable && (
            <details className="rounded-xl border border-line bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink-soft hover:text-ink">{t("booking.cancelTitle")}</summary>
              <CancelBookingForm bookingId={b.id} />
            </details>
          )}

          <Card>
            <CardSection>
              <h2 className="text-sm font-semibold">{t("booking.timeline")}</h2>
              <ol className="mt-3 space-y-3 border-l border-line pl-4">
                {b.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span aria-hidden className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-brand-600" />
                    <p className="text-sm font-medium">{e.type in eventLabels ? t(`booking.events.${e.type as keyof typeof eventLabels}`) : e.type}</p>
                    <p className="text-xs text-muted">
                      {formatDateTime(e.createdAt)}
                      {e.actor ? ` · ${e.actor.name}` : ""}
                    </p>
                    {e.note && <p className="mt-0.5 text-xs text-ink-soft">{e.note}</p>}
                  </li>
                ))}
              </ol>
              {party === "admin" && (
                <div className="mt-4">
                  <Badge tone="warning">{t("enums.role.ADMIN")}</Badge>
                </div>
              )}
            </CardSection>
          </Card>
        </aside>
      </div>
    </Container>
  );
}

const eventLabels = {
  created: 1,
  scheduled: 1,
  started: 1,
  completion_reported: 1,
  completed: 1,
  cancelled: 1,
  dispute_opened: 1,
  dispute_resolved: 1,
};
const feeReasons = { PRO_PLAN: 1, INDEPENDENT_CUSTOMER: 1, ZERO_FEE: 1, BASIC_PLATFORM_JOB: 1, DISPUTE_CANCELLED: 1 };

function ContactBlock({ name, phone, email }: { name: string; phone: string | null; email: string }) {
  return (
    <div className="space-y-1 py-0.5">
      <p className="font-medium">{name}</p>
      {phone ? (
        <a href={`tel:+354${phone}`} className="flex items-center gap-1.5 text-sm text-brand-700 hover:underline">
          <PhoneIcon className="size-4" /> {formatPhone(phone)}
        </a>
      ) : (
        <p className="text-sm text-muted">{t("booking.noPhone")}</p>
      )}
      <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-sm break-all text-brand-700 hover:underline">
        <MailIcon className="size-4 shrink-0" /> {email}
      </a>
    </div>
  );
}
