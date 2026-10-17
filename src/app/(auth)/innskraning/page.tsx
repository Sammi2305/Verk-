import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { homeForRole, safeNext } from "@/lib/auth/guards";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: t("auth.loginTitle"), robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(next, homeForRole(user.role)));
  const safe = safeNext(next, "");
  return (
    <AuthShell
      title={t("auth.loginTitle")}
      intro={safe ? t("auth.loginRequired") : t("auth.loginIntro")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link href={safe ? `/nyskraning?next=${encodeURIComponent(safe)}` : "/nyskraning"} className="font-medium text-brand-700 hover:underline">
            {t("auth.createAccount")}
          </Link>
        </>
      }
    >
      <LoginForm next={safe || undefined} />
    </AuthShell>
  );
}
