import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { homeForRole, safeNext } from "@/lib/auth/guards";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterCustomerForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: t("auth.registerTitle"), robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  const safe = safeNext(next, "");
  return (
    <AuthShell
      title={t("auth.registerTitle")}
      intro={t("auth.registerIntro")}
      footer={
        <div className="space-y-2">
          <p>
            {t("auth.haveAccount")}{" "}
            <Link href={safe ? `/innskraning?next=${encodeURIComponent(safe)}` : "/innskraning"} className="font-medium text-brand-700 hover:underline">
              {t("nav.login")}
            </Link>
          </p>
          <p>
            {t("auth.areYouPro")}{" "}
            <Link href="/nyskraning/fagadili" className="font-medium text-brand-700 hover:underline">
              {t("auth.proRegisterLink")}
            </Link>
          </p>
        </div>
      }
    >
      <RegisterCustomerForm next={safe || undefined} />
    </AuthShell>
  );
}
