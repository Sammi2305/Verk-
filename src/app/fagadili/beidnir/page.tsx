import { t } from "@/i18n";
import { requireTradesperson } from "@/lib/auth/guards";
import { formatShortDate } from "@/lib/format";
import { listInvitationsForPro } from "@/server/job-requests";
import { EmptyState } from "@/components/ui/primitives";
import { InvitationStatusBadge } from "@/components/status";
import { RowLink, RowList } from "@/components/lists";

export default async function ProRequestsPage() {
  const { profile } = await requireTradesperson("/fagadili/beidnir");
  const invitations = await listInvitationsForPro(profile.id);
  if (invitations.length === 0) return <EmptyState title={t("pro.newRequestsEmpty")} />;
  return (
    <RowList>
      {invitations.map((inv) => (
        <RowLink
          key={inv.id}
          href={`/fagadili/beidnir/${inv.id}`}
          highlight={!inv.seenAt && inv.status === "PENDING"}
          title={inv.jobRequest.title}
          meta={`${inv.jobRequest.category.nameIs} · ${inv.jobRequest.area.name} · ${formatShortDate(inv.createdAt)}`}
          aside={<InvitationStatusBadge status={inv.jobRequest.status === "CANCELLED" && inv.status === "PENDING" ? "NOT_SELECTED" : inv.status} audience="pro" />}
        />
      ))}
    </RowList>
  );
}
