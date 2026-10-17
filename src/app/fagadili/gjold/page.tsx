import Link from "next/link";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireTradesperson } from "@/lib/auth/guards";
import { formatDate, formatIsk } from "@/lib/format";
import { getPlans, getSettings, priceWithVatLabel } from "@/server/settings";
import { Alert, Badge, Card, CardSection, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { CheckIcon, WalletIcon } from "@/components/ui/icons";

export default async function ProBillingPage() {
  const { profile } = await requireTradesperson("/fagadili/gjold");
  const [settings, plans, subscription, charges] = await Promise.all([
    getSettings(),
    getPlans(),
    db.subscription.findUnique({ where: { profileId: profile.id } }),
    db.platformCharge.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { booking: { select: { id: true, jobRequest: { select: { title: true } } } } },
    }),
  ]);
  const current = subscription?.planCode ?? "BASIC";
  const basic = plans.find((p) => p.code === "BASIC");
  const pro = plans.find((p) => p.code === "PRO");

  return (
    <div className="space-y-6">
      {!settings.billingEnabled && <Alert tone="info">{t("pro.billingOffNotice")}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        {[basic, pro].filter(Boolean).map((plan) => {
          const p = plan!;
          const isCurrent = p.code === current;
          const price = priceWithVatLabel(p.code === "BASIC" ? p.perJobFeeIsk : p.monthlyPriceIsk, settings.pricesIncludeVat);
          return (
            <Card key={p.code} className={isCurrent ? "ring-2 ring-brand-600" : ""}>
              <CardSection>
                <div className="flex items-center justify-between gap-2">
                  <SectionTitle>{p.nameIs}</SectionTitle>
                  {isCurrent && <Badge tone="brand">{t("pro.currentPlan")}</Badge>}
                </div>
                <p className="mt-3 text-sm text-ink-soft">
                  {p.code === "BASIC"
                    ? t("pro.planBasicSummary", { fee: price.amount, vat: price.vat })
                    : t("pro.planProSummary", { price: price.amount, vat: price.vat })}
                </p>
                {p.code === "PRO" && !isCurrent && <p className="mt-3 text-sm text-muted">{t("pro.proUpgradeUnavailable")}</p>}
              </CardSection>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardSection>
          <SectionTitle>{t("pro.feeRulesTitle")}</SectionTitle>
          <ul className="mt-3 space-y-2">
            {[t("pro.feeRule1"), t("pro.feeRule2"), t("pro.feeRule3"), t("pro.feeRule4")].map((r) => (
              <li key={r} className="flex gap-2 text-sm text-ink-soft">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand-600" /> {r}
              </li>
            ))}
          </ul>
        </CardSection>
      </Card>

      <section className="space-y-3">
        <SectionTitle>{t("pro.chargesTitle")}</SectionTitle>
        {charges.length === 0 ? (
          <EmptyState icon={<WalletIcon />} title={t("pro.chargesEmpty")} />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">{t("common.date")}</th>
                  <th className="px-5 py-3 font-medium">{t("booking.title")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.amount")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {charges.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/bokanir/${c.booking.id}`} className="text-brand-700 hover:underline">
                        {c.booking.jobRequest?.title ?? t("booking.title")}
                      </Link>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {formatIsk(c.amountIsk)} <span className="text-muted">({c.amountIncludesVat ? t("common.vatIncluded") : t("common.vatExcluded")})</span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge>{t(`enums.chargeStatus.${c.status}`)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
