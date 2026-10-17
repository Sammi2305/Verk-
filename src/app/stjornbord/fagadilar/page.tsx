import Link from "next/link";
import type { ProfileStatus } from "@prisma/client";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { formatShortDate } from "@/lib/format";
import { ProfileStatusBadge } from "@/components/status";
import { EmptyState } from "@/components/ui/primitives";
import { FilterPills, Table, Td } from "../admin-ui";

const STATUSES: ProfileStatus[] = ["PENDING_REVIEW", "APPROVED", "DRAFT", "REJECTED", "SUSPENDED"];

export default async function AdminProfilesPage({ searchParams }: { searchParams: Promise<{ stada?: string }> }) {
  await requireAdmin("/stjornbord/fagadilar");
  const { stada } = await searchParams;
  const status = STATUSES.includes(stada as ProfileStatus) ? (stada as ProfileStatus) : "PENDING_REVIEW";
  const profiles = await db.tradespersonProfile.findMany({
    where: { status },
    orderBy: [{ submittedAt: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      user: { select: { email: true, emailVerifiedAt: true } },
      _count: { select: { qualifications: { where: { status: "PENDING" } } } },
    },
  });
  return (
    <>
      <FilterPills base="/stjornbord/fagadilar" param="stada" current={status === "PENDING_REVIEW" ? undefined : status} options={STATUSES.map((s, i) => ({ value: i === 0 ? undefined : s, label: t(`enums.profileStatus.${s}`) }))} />
      {profiles.length === 0 ? (
        <EmptyState title={t("admin.noResults")} />
      ) : (
        <Table head={[t("pro.businessName"), t("auth.email"), t("common.status"), t("pro.qualificationsTitle"), t("common.updated")]}>
          {profiles.map((p) => (
            <tr key={p.id} className="hover:bg-subtle/60">
              <Td>
                <Link href={`/stjornbord/fagadilar/${p.id}`} className="font-medium text-brand-700 hover:underline">
                  {p.businessName}
                </Link>
              </Td>
              <Td>
                {p.user.email}
                {!p.user.emailVerifiedAt && <span className="block text-xs text-warning-700">{t("admin.emailUnverified")}</span>}
              </Td>
              <Td>
                <ProfileStatusBadge status={p.status} />
              </Td>
              <Td>{p._count.qualifications > 0 ? `${p._count.qualifications} ${t("enums.verificationStatus.PENDING").toLowerCase()}` : "—"}</Td>
              <Td className="whitespace-nowrap">{formatShortDate(p.submittedAt ?? p.updatedAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
