import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { searchTradespeople } from "@/server/tradespeople";
import { Container, PageHeader } from "@/components/ui/primitives";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { InfoIcon } from "@/components/ui/icons";
import { NoResults, Pagination, ResultGrid } from "@/components/search-results";

type SP = { flokkur?: string; svaedi?: string; q?: string; laus?: string; vottad?: string; sida?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const hasFilters = Object.values(sp).some(Boolean);
  // Filtered search pages are not indexed; category pages are the SEO entry points.
  return { title: t("search.title"), description: t("search.metaDescription"), robots: hasFilters ? { index: false, follow: true } : undefined };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [categories, areas, result] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.area.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    searchTradespeople({
      category: sp.flokkur,
      area: sp.svaedi,
      q: sp.q,
      acceptingOnly: sp.laus === "1",
      verifiedOnly: sp.vottad === "1",
      page: Number(sp.sida) || 1,
    }),
  ]);

  const query = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "sida") p.set(k, v);
    if (page > 1) p.set("sida", String(page));
    return `/leit?${p.toString()}`;
  };
  const requestHref = `/verkbeidni/ny?${new URLSearchParams({ ...(sp.flokkur ? { flokkur: sp.flokkur } : {}), ...(sp.svaedi ? { svaedi: sp.svaedi } : {}) })}`;

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader title={t("search.title")} actions={<ButtonLink href={requestHref}>{t("nav.newRequest")}</ButtonLink>} />
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside>
          <form method="get" action="/leit" role="search" aria-label={t("search.filters")} className="space-y-5 rounded-(--radius-card) border border-line bg-surface p-5 shadow-(--shadow-card) lg:sticky lg:top-24">
            <div className="space-y-1.5">
              <label htmlFor="flokkur" className="block text-sm font-medium">{t("search.category")}</label>
              <Select name="flokkur" defaultValue={result.category?.slug ?? ""}>
                <option value="">{t("search.anyCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.nameIs}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="svaedi" className="block text-sm font-medium">{t("search.area")}</label>
              <Select name="svaedi" defaultValue={result.area?.slug ?? ""}>
                <option value="">{t("search.anyArea")}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.slug}>{a.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="q" className="block text-sm font-medium">{t("search.query")}</label>
              <Input name="q" type="search" maxLength={80} defaultValue={sp.q ?? ""} placeholder={t("search.queryPlaceholder")} />
            </div>
            <div className="space-y-3">
              <Checkbox name="laus" value="1" defaultChecked={sp.laus === "1"} label={t("search.acceptingOnly")} />
              <Checkbox name="vottad" value="1" defaultChecked={sp.vottad === "1"} label={t("search.verifiedOnly")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">{t("search.apply")}</Button>
              <Link href="/leit" className="inline-flex h-11 items-center px-2 text-sm text-muted hover:text-ink">{t("search.reset")}</Link>
            </div>
          </form>
        </aside>
        <section aria-live="polite">
          <p className="mb-4 text-sm font-medium text-ink-soft">
            {result.total === 1 ? t("search.resultOne") : t("search.resultMany", { count: result.total })}
          </p>
          {result.total === 0 ? (
            <NoResults />
          ) : (
            <>
              <ResultGrid results={result.results} />
              <Pagination page={result.page} pageCount={result.pageCount} hrefFor={query} />
            </>
          )}
          <p className="mt-8 flex gap-2 text-xs leading-relaxed text-muted">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            {t("search.rankingNote")}
          </p>
        </section>
      </div>
    </Container>
  );
}
