import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { CategoryView } from "@/components/category-view";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sida?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findFirst({ where: { slug, active: true } });
  if (!category) return {};
  return {
    title: t("categories.metaTitle", { name: category.nameIs }),
    description: category.descriptionIs ?? undefined,
    alternates: { canonical: `/flokkar/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sida } = await searchParams;
  const category = await db.category.findFirst({ where: { slug, active: true } });
  if (!category) notFound();
  return <CategoryView category={category} page={Number(sida) || 1} />;
}
