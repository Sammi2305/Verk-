import Link from "next/link";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/guards";
import { logoutAction } from "@/app/(auth)/actions";
import { Container } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { BellIcon, MenuIcon, UserIcon } from "@/components/ui/icons";
import { Logo } from "./logo";

export async function Header() {
  const user = await getCurrentUser();
  const unread = user ? await db.notification.count({ where: { userId: user.id, readAt: null } }) : 0;
  const dashboardLabel =
    user?.role === "ADMIN" ? t("nav.admin") : user?.role === "TRADESPERSON" ? t("nav.proDashboard") : t("nav.myPages");

  const publicLinks = [
    { href: "/leit", label: t("nav.findPros") },
    { href: "/flokkar", label: t("nav.categories") },
    ...(user ? [] : [{ href: "/fyrir-fagfolk", label: t("nav.forPros") }]),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label={t("a11y.mainNav")} className="hidden items-center gap-1 md:flex">
          {publicLinks.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-subtle hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/tilkynningar"
                className="relative grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-subtle"
                aria-label={unread ? t("a11y.unread", { label: t("nav.notifications"), count: unread }) : t("nav.notifications")}
              >
                <BellIcon />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 grid min-w-4.5 place-items-center rounded-full bg-danger-600 px-1 text-[0.65rem] leading-4.5 font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <details className="group relative">
                <summary className={buttonClass("outline", "sm", "cursor-pointer gap-1.5 pr-3")}>
                  <UserIcon className="size-4.5" />
                  <span className="max-w-28 truncate">{user.name.split(" ")[0]}</span>
                </summary>
                <div className="absolute right-0 mt-2 w-60 animate-fade-in rounded-xl border border-line bg-surface p-1.5 shadow-(--shadow-raised)">
                  <p className="truncate px-3 pt-2 pb-1 text-xs text-muted">{user.email}</p>
                  <MenuLink href={homeForRole(user.role)}>{dashboardLabel}</MenuLink>
                  {user.role === "CUSTOMER" && <MenuLink href="/verkbeidni/ny">{t("nav.newRequest")}</MenuLink>}
                  <MenuLink href="/minar-sidur/stillingar">{t("dashboard.settings")}</MenuLink>
                  <div className="md:hidden">
                    {publicLinks.map((l) => (
                      <MenuLink key={l.href} href={l.href}>
                        {l.label}
                      </MenuLink>
                    ))}
                  </div>
                  <form action={logoutAction} className="mt-1 border-t border-line pt-1">
                    <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-subtle hover:text-ink">
                      {t("nav.logout")}
                    </button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <span className="hidden sm:block">
                <Link href="/innskraning" className={buttonClass("ghost", "sm")}>
                  {t("nav.login")}
                </Link>
              </span>
              <Link href="/verkbeidni/ny" className={buttonClass("accent", "sm")}>
                {t("nav.newRequest")}
              </Link>
              <details className="relative md:hidden">
                <summary className="grid size-10 cursor-pointer place-items-center rounded-xl text-ink-soft hover:bg-subtle" aria-label={t("nav.menu")}>
                  <MenuIcon />
                </summary>
                <div className="absolute right-0 mt-2 w-56 animate-fade-in rounded-xl border border-line bg-surface p-1.5 shadow-(--shadow-raised)">
                  {publicLinks.map((l) => (
                    <MenuLink key={l.href} href={l.href}>
                      {l.label}
                    </MenuLink>
                  ))}
                  <MenuLink href="/innskraning">{t("nav.login")}</MenuLink>
                  <MenuLink href="/nyskraning">{t("nav.register")}</MenuLink>
                </div>
              </details>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-subtle hover:text-ink">
      {children}
    </Link>
  );
}
