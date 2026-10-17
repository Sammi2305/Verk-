import Link from "next/link";
import { t } from "@/i18n";
import type { ProfileCard as ProfileCardData } from "@/server/tradespeople";
import { ProfileCard } from "@/components/profile-card";
import { EmptyState } from "@/components/ui/primitives";
import { SearchIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/button";

export function ResultGrid({ results }: { results: ProfileCardData[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((p) => (
        <li key={p.id} className="min-w-0">
          <ProfileCard profile={p} />
        </li>
      ))}
    </ul>
  );
}

export function NoResults({ title, text, action }: { title?: string; text?: string; action?: React.ReactNode }) {
  return (
    <EmptyState icon={<SearchIcon />} title={title ?? t("search.noResultsTitle")} action={action}>
      {text ?? t("search.noResultsText")}
    </EmptyState>
  );
}

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Síður" className="mt-8 flex items-center justify-center gap-3">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className={buttonClass("outline", "sm")}>
          {t("common.previous")}
        </Link>
      )}
      <span className="text-sm text-muted">{t("common.page", { page })} / {pageCount}</span>
      {page < pageCount && (
        <Link href={hrefFor(page + 1)} className={buttonClass("outline", "sm")}>
          {t("common.next")}
        </Link>
      )}
    </nav>
  );
}
