import { appUrl } from "@/lib/runtime-config";
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { publicProfileWhere } from "@/server/tradespeople";

export const dynamic = "force-dynamic";

/**
 * Only real, useful pages: static pages, active categories, category+area
 * pages that actually have approved tradespeople, and approved profiles.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const [categories, combos, profiles] = await Promise.all([
    db.category.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    db.tradespersonCategory.findMany({
      where: { category: { active: true }, profile: publicProfileWhere },
      select: { category: { select: { slug: true } }, profile: { select: { areas: { where: { area: { active: true } }, select: { area: { select: { slug: true } } } } } } },
    }),
    db.tradespersonProfile.findMany({ where: publicProfileWhere, select: { slug: true, updatedAt: true } }),
  ]);
  const pairs = new Set<string>();
  for (const c of combos) for (const a of c.profile.areas) pairs.add(`${c.category.slug}/${a.area.slug}`);

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/flokkar`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/leit`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/fyrir-fagfolk`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/verdskra`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/personuvernd`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/skilmalar`, changeFrequency: "yearly", priority: 0.2 },
    ...categories.map((c) => ({ url: `${base}/flokkar/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...[...pairs].map((p) => ({ url: `${base}/flokkar/${p}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...profiles.map((p) => ({ url: `${base}/fagfolk/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
