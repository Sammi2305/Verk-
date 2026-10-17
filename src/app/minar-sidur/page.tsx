import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { requireUser } from "@/lib/auth/guards";
import { formatShortDate, formatTimeRange } from "@/lib/format";
import { listRequestsForCustomer } from "@/server/job-requests";
import { listBookingsForCustomer } from "@/server/bookings";
import { Container, EmptyState, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { BookingStatusBadge, RequestStatusBadge } from "@/components/status";
import { RowLink, RowList } from "@/components/lists";
import { UnverifiedBanner } from "@/components/unverified-banner";
import { WrenchIcon } from "@/components/ui/icons";

export default async function CustomerDashboard() {
  const user = await requireUser("/minar-sidur");
  if (user.role === "TRADESPERSON") redirect("/fagadili");
  if (user.role === "ADMIN") redirect("/stjornbord");
  const [requests, bookings] = await Promise.all([listRequestsForCustomer(user.id), listBookingsForCustomer(user.id)]);
  const openRequests = requests.filter((r) => r.status !== "BOOKED");

  return (
    <Container className="py-8 sm:py-12">
      <PageHeader
        title={t("dashboard.greeting", { name: user.name.split(" ")[0] })}
        actions={<ButtonLink href="/verkbeidni/ny">{t("dashboard.newRequest")}</ButtonLink>}
      />
      {!user.emailVerified && <UnverifiedBanner />}
      {requests.length === 0 ? (
        <EmptyState icon={<WrenchIcon />} title={t("dashboard.emptyTitle")} action={<ButtonLink href="/verkbeidni/ny">{t("dashboard.newRequest")}</ButtonLink>}>
          {t("dashboard.emptyText")}
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {bookings.length > 0 && (
            <section className="space-y-3">
              <SectionTitle>{t("dashboard.bookingsTitle")}</SectionTitle>
              <RowList>
                {bookings.map((b) => (
                  <RowLink
                    key={b.id}
                    href={`/bokanir/${b.id}`}
                    title={b.jobRequest?.title ?? t("booking.title")}
                    meta={`${b.profile.businessName} · ${b.scheduledStart && b.scheduledEnd ? formatTimeRange(b.scheduledStart, b.scheduledEnd) : t("booking.timeNotSet")}`}
                    aside={<BookingStatusBadge status={b.status} />}
                  />
                ))}
              </RowList>
            </section>
          )}
          {openRequests.length > 0 && (
            <section className="space-y-3">
              <SectionTitle>{t("dashboard.requestsTitle")}</SectionTitle>
              <RowList>
                {openRequests.map((r) => {
                  const answers = r.invitations.filter((i) => i.status === "ACCEPTED").length;
                  return (
                    <RowLink
                      key={r.id}
                      href={`/minar-sidur/beidnir/${r.id}`}
                      highlight={r.status === "SUBMITTED" && answers > 0}
                      title={r.title}
                      meta={`${r.category.nameIs} · ${formatShortDate(r.createdAt)}${r.status === "SUBMITTED" ? ` · ${answers === 1 ? t("dashboard.responsesOne") : t("dashboard.responsesCount", { count: answers })}` : ""}`}
                      aside={<RequestStatusBadge status={r.status} />}
                    />
                  );
                })}
              </RowList>
            </section>
          )}
        </div>
      )}
    </Container>
  );
}
