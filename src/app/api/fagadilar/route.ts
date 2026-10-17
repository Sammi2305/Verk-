import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listEligibleForRequest } from "@/server/tradespeople";

// Public data only: tradespeople who currently accept requests in a category
// and area. Used by the job-request form to let the customer pick recipients.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("flokkur")?.slice(0, 40);
  const areaId = url.searchParams.get("svaedi")?.slice(0, 40);
  if (!categoryId || !areaId) return NextResponse.json({ items: [] });
  const [category, area] = await Promise.all([
    db.category.findFirst({ where: { id: categoryId, active: true }, select: { id: true } }),
    db.area.findFirst({ where: { id: areaId, active: true }, select: { id: true } }),
  ]);
  if (!category || !area) return NextResponse.json({ items: [] });
  const rows = await listEligibleForRequest(category.id, area.id);
  return NextResponse.json({
    items: rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      businessName: p.businessName,
      verified: p.qualifications.length > 0,
      categories: p.categories.map((c) => c.category.nameIs),
      description: p.description.slice(0, 140),
    })),
  });
}
