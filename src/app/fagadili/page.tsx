import { t } from "@/i18n";
import { requireTradesperson } from "@/lib/auth/guards";
import { formatShortDate, formatTimeRange } from "@/lib/format";
import { listInvitationsForPro } from "@/server/job-requests";
import { listBookingsForPro } from "@/server/bookings";
import { toggleAcceptingAction } from "./actions";
import { Card, CardSection, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge, InvitationStatusBadge } from "@/components/status";
import { ProfileStatusAlert } from "@/components/pro-status";
import { RowLink, RowList } from "@/components/lists";
import { CalendarIcon, PauseIcon } from "@/components/ui/icons";

export default async function ProOverviewPage() {
  const { profile } = await requireTradesperson("/fagadili");
  const [invitations, bookings] = await Promise.all([
    listInvitationsForPro(profile.id, ["PENDING"]),
    listBookingsForPro(profile.id, ["ACCEPTED", "SCHEDULED", "IN_PROGRESS", "DISPUTED"]),
  ]);
  const openInvitations = invitations.filter((i) => i.jobRequest.status === "SUBMITTED");

  return (
    <div className="space-y-8">
      <ProfileStatusAlert profile={profile} />

      {profile.status === "APPROVED" && (
        <Card>
          <CardSection className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${profile.acceptingRequests ? "bg-success-700" : "bg-line-strong"}`} aria-hidden />
              <div>
                <p className="font-medium">{t("pro.acceptingTitle")}</p>
                <p className="text-sm text-muted">{profile.acceptingRequests ? t("pro.acceptingOn") : t("pro.acceptingOff")}</p>
              </div>
            </div>
            <form action={toggleAcceptingAction}>
              <input type="hidden" name="accepting" value={profile.acceptingRequests ? "0" : "1"} />
              <Button type="submit" variant={profile.acceptingRequests ? "outline" : "primary"}>
                {profile.acceptingRequests && <PauseIcon className="size-4" />}
                {profile.acceptingRequests ? t("pro.pause") : t("pro.resume")}
              </Button>
            </form>
          </CardSection>
        </Card>
      )}

      <section className="space-y-3">
        <SectionTitle>{t("pro.newRequests")}</SectionTitle>
        {openInvitations.length === 0 ? (
          <EmptyState title={t("pro.newRequestsEmpty")} />
        ) : (
          <RowList>
            {openInvitations.map((inv) => (
              <RowLink
                key={inv.id}
                href={`/fagadili/beidnir/${inv.id}`}
                highlight={!inv.seenAt}
                title={inv.jobRequest.title}
                meta={`${inv.jobRequest.category.nameIs} · ${inv.jobRequest.area.name} · ${t(`enums.urgency.${inv.jobRequest.urgency}`)} · ${formatShortDate(inv.createdAt)}`}
                aside={<InvitationStatusBadge status={inv.status} audience="pro" />}
              />
            ))}
          </RowList>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>{t("pro.activeBookings")}</SectionTitle>
        {bookings.length === 0 ? (
          <EmptyState icon={<CalendarIcon />} title={t("pro.activeBookingsEmpty")} />
        ) : (
          <RowList>
            {bookings.map((b) => (
              <RowLink
                key={b.id}
                href={`/bokanir/${b.id}`}
                title={b.jobRequest?.title ?? t("booking.title")}
                meta={`${b.customer.name} · ${b.scheduledStart && b.scheduledEnd ? formatTimeRange(b.scheduledStart, b.scheduledEnd) : t("booking.timeNotSet")}`}
                aside={<BookingStatusBadge status={b.status} />}
              />
            ))}
          </RowList>
        )}
      </section>
    </div>
  );
}
