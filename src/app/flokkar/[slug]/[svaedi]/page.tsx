import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { publicProfileWhere } from "@/server/tradespeople";
import { CategoryView } from "@/components/category-view";

type Props = { params: Promise<{ slug: string; svaedi: string }>; searchParams: Promise<{ sida?: string }> };

async function load(slug: string, svaedi: string) {
  const [category, area] = await Promise.all([
    db.category.findFirst({ where: { slug, active: true } }),
    db.area.findFirst({ where: { slug: svaedi, active: true } }),
  ]);
  return { category, area };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, svaedi } = await params;
  const { category, area } = await load(slug, svaedi);
  if (!category || !area) return {};
  const count = await db.tradespersonProfile.count({
    where: { ...publicProfileWhere, categories: { some: { categoryId: category.id } }, areas: { some: { areaId: area.id } } },
  });
  return {
    title: t("categories.metaTitleArea", { name: category.nameIs, area: area.name }),
    description: category.descriptionIs ?? undefined,
    alternates: { canonical: `/flokkar/${slug}/${svaedi}` },
    // Empty category/area combinations are not indexed (no thin pages).
    robots: count === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryAreaPage({ params, searchParams }: Props) {
  const { slug, svaedi } = await params;
  const { sida } = await searchParams;
  const { category, area } = await load(slug, svaedi);
  if (!category || !area) notFound();
  return <CategoryView category={category} area={area} page={Number(sida) || 1} />;
}
