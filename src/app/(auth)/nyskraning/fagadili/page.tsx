import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/guards";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterTradespersonForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: t("auth.proRegisterTitle"), description: t("auth.proRegisterIntro") };

export default async function RegisterProPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  return (
    <AuthShell
      title={t("auth.proRegisterTitle")}
      intro={t("auth.proRegisterIntro")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link href="/innskraning" className="font-medium text-brand-700 hover:underline">
            {t("nav.login")}
          </Link>
          {" · "}
          <Link href="/verdskra" className="font-medium text-brand-700 hover:underline">
            {t("home.prosPricing")}
          </Link>
        </>
      }
    >
      <RegisterTradespersonForm />
    </AuthShell>
  );
}
