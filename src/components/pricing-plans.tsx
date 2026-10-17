import { t } from "@/i18n";
import { formatIsk } from "@/lib/format";
import { getPlans, getSettings } from "@/server/settings";
import { Badge, Card, CardSection } from "@/components/ui/primitives";
import { CheckIcon } from "@/components/ui/icons";

/** Plan cards rendered from the admin-configured prices (never hardcoded). */
export async function PricingPlans() {
  const [plans, settings] = await Promise.all([getPlans(), getSettings()]);
  const vat = settings.pricesIncludeVat ? t("pricing.vatNoteIncluded") : t("pricing.vatNoteExcluded", { rate: settings.vatRatePercent });
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.code} className={p.code === "BASIC" ? "ring-2 ring-brand-600" : ""}>
            <CardSection className="sm:p-8">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-semibold">{p.nameIs}</h3>
                {p.code === "PRO" && <Badge tone="accent">{t("pricing.comingSoonBadge")}</Badge>}
              </div>
              {p.code === "BASIC" ? (
                <>
                  <p className="mt-4 text-4xl font-semibold tracking-tight">{t("common.free")}</p>
                  <p className="mt-1 text-sm text-muted">
                    {t("pricing.noMonthly")} · {formatIsk(p.perJobFeeIsk)} {t("pricing.perJob")}
                  </p>
                  <p className="mt-5 text-sm leading-relaxed text-ink-soft">{t("pricing.basicFeatures")}</p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-4xl font-semibold tracking-tight">
                    {formatIsk(p.monthlyPriceIsk)}
                    <span className="ml-1 text-base font-normal text-muted">{t("common.perMonth")}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">{t("pricing.noPerJob")}</p>
                  <p className="mt-5 text-sm leading-relaxed text-ink-soft">{t("pricing.proFeatures")}</p>
                  <p className="mt-3 text-sm text-muted">{t("pricing.proComingSoon")}</p>
                </>
              )}
            </CardSection>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">{vat}</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {[t("pro.feeRule1"), t("pro.feeRule2"), t("pro.feeRule3"), t("pro.feeRule4"), t("pricing.customersFree")].map((r) => (
          <li key={r} className="flex gap-2.5 text-sm text-ink-soft">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand-600" /> {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
