import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { formatShortDate } from "@/lib/format";
import { BookingStatusBadge } from "@/components/status";
import { EmptyState } from "@/components/ui/primitives";
import { FilterPills, Table, Td } from "../admin-ui";

const STATUSES: BookingStatus[] = ["DISPUTED", "ACCEPTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ stada?: string }> }) {
  await requireAdmin("/stjornbord/bokanir");
  const { stada } = await searchParams;
  const status = STATUSES.includes(stada as BookingStatus) ? (stada as BookingStatus) : undefined;
  const bookings = await db.booking.findMany({
    where: status ? { status } : {},
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { jobRequest: { select: { title: true } }, profile: { select: { businessName: true } }, customer: { select: { name: true } } },
  });
  return (
    <>
      <FilterPills base="/stjornbord/bokanir" param="stada" current={status} options={[{ label: t("common.all") }, ...STATUSES.map((s) => ({ value: s, label: t(`enums.bookingStatus.${s}`) }))]} />
      {bookings.length === 0 ? (
        <EmptyState title={t("admin.noResults")} />
      ) : (
        <Table head={[t("booking.title"), t("common.customer"), t("common.tradesperson"), t("common.status"), t("common.updated")]}>
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-subtle/60">
              <Td>
                <Link href={b.status === "DISPUTED" ? `/stjornbord/bokanir/${b.id}` : `/bokanir/${b.id}`} className="font-medium text-brand-700 hover:underline">
                  {b.jobRequest?.title ?? b.id}
                </Link>
              </Td>
              <Td>{b.customer.name}</Td>
              <Td>{b.profile.businessName}</Td>
              <Td>
                <BookingStatusBadge status={b.status} />
              </Td>
              <Td className="whitespace-nowrap">{formatShortDate(b.updatedAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
