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
        <div className="flex items-center gap-3">
          <LogoMark className="size-7" />
          <div>
            <p className="text-sm font-medium text-ink">{t("site.tagline")}</p>
            <p className="text-xs text-muted">{t("footer.rights", { year })}</p>
          </div>
        </div>
        <nav aria-label="Fótur" className="flex flex-wrap gap-x-5 gap-y-2">
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
