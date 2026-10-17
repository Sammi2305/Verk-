import Link from "next/link";
import type { Area, Category } from "@prisma/client";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { publicProfileWhere, searchTradespeople } from "@/server/tradespeople";
import { Alert, Container, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { NoResults, Pagination, ResultGrid } from "@/components/search-results";

/** Areas that actually have approved tradespeople in this category (avoids thin pages). */
export async function areasWithPros(categoryId: string) {
  return db.area.findMany({
    where: { active: true, tradespeople: { some: { profile: { ...publicProfileWhere, categories: { some: { categoryId } } } } } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function CategoryView({ category, area, page }: { category: Category; area?: Area; page: number }) {
  const [result, areas] = await Promise.all([
    searchTradespeople({ category: category.slug, area: area?.slug, page }),
    areasWithPros(category.id),
  ]);
  const base = area ? `/flokkar/${category.slug}/${area.slug}` : `/flokkar/${category.slug}`;
  const requestHref = `/verkbeidni/ny?flokkur=${category.slug}${area ? `&svaedi=${area.slug}` : ""}`;

  return (
    <Container className="py-10 sm:py-14">
      <nav aria-label="Brauðmolar" className="mb-4 text-sm text-muted">
        <Link href="/flokkar" className="hover:text-ink">
          {t("nav.categories")}
        </Link>
        {area && (
          <>
            {" / "}
            <Link href={`/flokkar/${category.slug}`} className="hover:text-ink">
              {category.nameIs}
            </Link>
          </>
        )}
      </nav>
      <PageHeader
        title={area ? t("categories.metaTitleArea", { name: category.nameIs, area: area.name }) : category.nameIs}
        description={category.descriptionIs}
        actions={<ButtonLink href={requestHref}>{t("categories.requestInCategory")}</ButtonLink>}
      />
      {category.licenseRelevant && (
        <Alert tone="info" className="mb-6">
          {t("categories.licenseNote")}
        </Alert>
      )}
      {areas.length > 0 && (
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-ink-soft">{t("categories.browseByArea")}</p>
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <Link
                key={a.id}
                href={`/flokkar/${category.slug}/${a.slug}`}
                aria-current={a.id === area?.id ? "page" : undefined}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft hover:border-brand-200 hover:text-ink aria-[current=page]:border-brand-600 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-700"
              >
                {a.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      <h2 className="sr-only">{t("categories.prosInCategory")}</h2>
      {result.total === 0 ? (
        <NoResults title={t("categories.emptyTitle")} text={t("categories.emptyText")} />
      ) : (
        <>
          <ResultGrid results={result.results} />
          <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(p) => `${base}?sida=${p}`} />
        </>
      )}
    </Container>
  );
}
