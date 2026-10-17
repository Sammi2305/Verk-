import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { resolveDisputeAction } from "../../actions";
import { Alert, Badge, Card, CardSection, SectionTitle } from "@/components/ui/primitives";
import { BookingStatusBadge } from "@/components/status";
import { DecisionForm } from "@/components/forms/admin-forms";

export default async function AdminBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/stjornbord/bokanir/${id}`);
  const b = await db.booking.findUnique({
    where: { id },
    include: {
      jobRequest: { select: { title: true } },
      profile: { select: { businessName: true } },
      customer: { select: { name: true } },
      disputes: { orderBy: { createdAt: "desc" }, include: { openedBy: { select: { name: true } }, resolvedBy: { select: { name: true } } } },
    },
  });
  if (!b) notFound();
  const open = b.disputes.find((d) => d.status === "OPEN");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{b.jobRequest?.title ?? b.id}</h2>
          <p className="text-sm text-muted">
            {b.customer.name} · {b.profile.businessName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BookingStatusBadge status={b.status} />
          <Link href={`/bokanir/${b.id}`} className="text-sm font-medium text-brand-700 hover:underline">
            {t("common.view")} →
          </Link>
        </div>
      </div>
      {b.disputes.length === 0 && <Alert tone="neutral">{t("admin.noResults")}</Alert>}
      {b.disputes.map((d) => (
        <Card key={d.id}>
          <CardSection className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>{t("admin.disputes")}</SectionTitle>
              <Badge tone={d.status === "OPEN" ? "danger" : "neutral"}>{t(`enums.disputeStatus.${d.status}`)}</Badge>
            </div>
            <p className="text-sm text-muted">
              {d.openedBy.name} · {formatDateTime(d.createdAt)}
            </p>
            <p className="whitespace-pre-line">{d.reason}</p>
            {d.resolution && (
              <p className="rounded-lg bg-subtle p-3 text-sm">
                {d.resolution}
                <span className="mt-1 block text-xs text-muted">
                  {d.resolvedBy?.name} · {d.resolvedAt && formatDateTime(d.resolvedAt)}
                </span>
              </p>
            )}
          </CardSection>
        </Card>
      ))}
      {open && (
        <Card>
          <CardSection>
            <SectionTitle className="mb-4">{t("admin.disputeResolveTitle")}</SectionTitle>
            <DecisionForm
              action={resolveDisputeAction}
              hidden={{ bookingId: b.id }}
              buttonName="outcome"
              noteLabel={t("admin.resolution")}
              buttons={[
                { value: "COMPLETED", label: t("admin.resolveCompleted"), variant: "primary" },
                { value: "CANCELLED", label: t("admin.resolveCancelled") },
              ]}
            />
          </CardSection>
        </Card>
      )}
    </div>
  );
}
