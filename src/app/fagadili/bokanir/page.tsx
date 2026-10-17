import { t } from "@/i18n";
import { requireTradesperson } from "@/lib/auth/guards";
import { formatShortDate, formatTimeRange } from "@/lib/format";
import { listBookingsForPro } from "@/server/bookings";
import { EmptyState } from "@/components/ui/primitives";
import { BookingStatusBadge } from "@/components/status";
import { RowLink, RowList } from "@/components/lists";
import { CalendarIcon } from "@/components/ui/icons";

export default async function ProBookingsPage() {
  const { profile } = await requireTradesperson("/fagadili/bokanir");
  const bookings = await listBookingsForPro(profile.id);
  if (bookings.length === 0) return <EmptyState icon={<CalendarIcon />} title={t("pro.activeBookingsEmpty")} />;
  return (
    <RowList>
      {bookings.map((b) => (
        <RowLink
          key={b.id}
          href={`/bokanir/${b.id}`}
          title={b.jobRequest?.title ?? t("booking.title")}
          meta={`${b.customer.name} · ${b.scheduledStart && b.scheduledEnd ? formatTimeRange(b.scheduledStart, b.scheduledEnd) : formatShortDate(b.createdAt)}`}
          aside={<BookingStatusBadge status={b.status} />}
        />
      ))}
    </RowList>
  );
}
