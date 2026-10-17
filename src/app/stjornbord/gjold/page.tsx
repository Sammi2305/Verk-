import Link from "next/link";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDate, formatIsk } from "@/lib/format";
import { getSettings } from "@/server/settings";
import { CHARGE_TRANSITIONS } from "@/server/admin";
import { adjustChargeAction } from "../actions";
import { Alert, Badge, EmptyState } from "@/components/ui/primitives";
import { DecisionForm } from "@/components/forms/admin-forms";
import { Table, Td } from "../admin-ui";

export default async function AdminChargesPage() {
  await requireAdmin("/stjornbord/gjold");
  const [settings, charges] = await Promise.all([
    getSettings(),
    db.platformCharge.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        profile: { select: { businessName: true } },
        booking: { select: { id: true, jobRequest: { select: { title: true } } } },
        adjustments: { orderBy: { createdAt: "desc" }, include: { admin: { select: { name: true } } } },
      },
    }),
  ]);
  return (
    <div className="space-y-5">
      {!settings.billingEnabled && <Alert tone="info">{t("admin.billingDisabledExplain")}</Alert>}
      {charges.length === 0 ? (
        <EmptyState title={t("pro.chargesEmpty")} />
      ) : (
        <Table head={[t("common.date"), t("common.tradesperson"), t("booking.title"), t("common.amount"), t("common.status"), t("admin.chargeAdjust")]} minWidth="60rem">
          {charges.map((c) => (
            <tr key={c.id}>
              <Td className="whitespace-nowrap">{formatDate(c.createdAt)}</Td>
              <Td>{c.profile.businessName}</Td>
              <Td>
                <Link href={`/bokanir/${c.booking.id}`} className="text-brand-700 hover:underline">
                  {c.booking.jobRequest?.title ?? c.booking.id}
                </Link>
              </Td>
              <Td className="whitespace-nowrap">
                {formatIsk(c.amountIsk)}
                <span className="block text-xs text-muted">
                  {c.amountIncludesVat ? t("common.vatIncluded") : t("common.vatExcluded")} · {c.vatRatePercent}% · {t(`enums.planCode.${c.planCode}`)}
                </span>
              </Td>
              <Td>
                <Badge>{t(`enums.chargeStatus.${c.status}`)}</Badge>
                {c.adjustments.map((a) => (
                  <p key={a.id} className="mt-1 text-xs text-muted">
                    {t(`enums.chargeStatus.${a.fromStatus}`)} → {t(`enums.chargeStatus.${a.toStatus}`)}: {a.reason} ({a.admin.name})
                  </p>
                ))}
              </Td>
              <Td className="min-w-64">
                {CHARGE_TRANSITIONS[c.status].length > 0 ? (
                  <DecisionForm
                    action={adjustChargeAction}
                    hidden={{ chargeId: c.id }}
                    buttonName="status"
                    noteLabel={t("admin.chargeAdjustReason")}
                    buttons={CHARGE_TRANSITIONS[c.status].map((s) => ({ value: s, label: t(`enums.chargeStatus.${s}`) }))}
                  />
                ) : (
                  "—"
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
