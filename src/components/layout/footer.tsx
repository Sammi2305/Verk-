import Link from "next/link";
import { t } from "@/i18n";
import { Container } from "@/components/ui/primitives";
import { LogoMark } from "./logo";

export function Footer() {
  const year = new Date().getFullYear();
  const links = [
    { href: "/fyrir-fagfolk", label: t("footer.forPros") },
    { href: "/verdskra", label: t("footer.pricing") },
    { href: "/personuvernd", label: t("footer.privacy") },
    { href: "/skilmalar", label: t("footer.terms") },
  ];
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <LogoMark className="size-8" />
            <div>
              <p className="text-sm font-semibold text-brand-600">{t("site.tagline")}</p>
              <p className="text-xs text-muted">{t("footer.rights", { year })}</p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label={t("a11y.brandValues")}>
            <li className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white">{t("brandValues.trust")}</li>
            <li className="rounded-full bg-accent-500 px-3 py-1 text-xs font-medium text-ink">{t("brandValues.simplicity")}</li>
            <li className="rounded-full bg-line px-3 py-1 text-xs font-medium text-brand-600">{t("brandValues.professionalism")}</li>
          </ul>
        </div>
        <nav aria-label={t("a11y.footerNav")} className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
