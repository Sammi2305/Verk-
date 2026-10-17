import { t } from "@/i18n";
import { requireAdmin } from "@/lib/auth/guards";
import { getPlan, getSettings } from "@/server/settings";
import { Alert, Badge, Card, CardSection, SectionTitle } from "@/components/ui/primitives";
import { PricingForm } from "@/components/forms/admin-forms";

export default async function AdminSettingsPage() {
  await requireAdmin("/stjornbord/stillingar");
  const [settings, basic, pro] = await Promise.all([getSettings(), getPlan("BASIC"), getPlan("PRO")]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardSection>
          <SectionTitle className="mb-5">{t("admin.plansTitle")}</SectionTitle>
          <PricingForm
            values={{
              basicPerJobFeeIsk: basic.perJobFeeIsk,
              proMonthlyPriceIsk: pro.monthlyPriceIsk,
              vatRatePercent: settings.vatRatePercent,
              pricesIncludeVat: settings.pricesIncludeVat,
              maxInvitesPerRequest: settings.maxInvitesPerRequest,
            }}
          />
        </CardSection>
      </Card>
      <Card className="self-start">
        <CardSection className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionTitle>{t("admin.billingEnabled")}</SectionTitle>
            <Badge tone={settings.billingEnabled ? "success" : "neutral"}>{settings.billingEnabled ? t("common.yes") : t("common.no")}</Badge>
          </div>
          <Alert tone="info">{t("admin.billingDisabledExplain")}</Alert>
        </CardSection>
      </Card>
    </div>
  );
}
