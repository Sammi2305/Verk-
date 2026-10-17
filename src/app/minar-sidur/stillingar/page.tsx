import { t } from "@/i18n";
import { requireUser } from "@/lib/auth/guards";
import { AccountForm, DeleteAccountForm } from "@/components/forms/account-forms";
import { Card, CardSection, Container, PageHeader, SectionTitle } from "@/components/ui/primitives";

export default async function SettingsPage() {
  const user = await requireUser("/minar-sidur/stillingar");
  return (
    <Container className="max-w-2xl py-8 sm:py-12">
      <PageHeader title={t("dashboard.settingsTitle")} />
      <div className="space-y-6">
        <Card>
          <CardSection>
            <SectionTitle className="mb-5">{t("dashboard.accountSection")}</SectionTitle>
            <AccountForm name={user.name} phone={user.phone ?? ""} email={user.email} emailNotifications={user.emailNotifications} />
          </CardSection>
        </Card>
        {user.role !== "ADMIN" && (
          <Card>
            <CardSection>
              <SectionTitle>{t("dashboard.deleteSection")}</SectionTitle>
              <p className="mt-1.5 mb-5 text-sm text-muted">{t("dashboard.deleteText")}</p>
              <DeleteAccountForm />
            </CardSection>
          </Card>
        )}
      </div>
    </Container>
  );
}
