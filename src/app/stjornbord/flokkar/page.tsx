import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { toggleAreaAction } from "../actions";
import { Badge, Card, CardSection, SectionTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/forms/admin-forms";

export default async function AdminCategoriesPage() {
  await requireAdmin("/stjornbord/flokkar");
  const [categories, areas] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { tradespeople: true } } } }),
    db.area.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <Card>
          <CardSection>
            <SectionTitle className="mb-4">{t("admin.categoryNew")}</SectionTitle>
            <CategoryForm nextSort={categories.length} />
          </CardSection>
        </Card>
        {categories.map((c) => (
          <details key={c.id} className="rounded-(--radius-card) border border-line bg-surface">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
              <span className="font-medium">{c.nameIs}</span>
              <span className="flex items-center gap-2 text-sm text-muted">
                {c._count.tradespeople}
                {!c.active && <Badge tone="neutral">{t("admin.inactive")}</Badge>}
              </span>
            </summary>
            <div className="border-t border-line p-5">
              <CategoryForm category={c} />
            </div>
          </details>
        ))}
      </div>
      <Card className="self-start">
        <CardSection>
          <SectionTitle className="mb-3">{t("admin.areas")}</SectionTitle>
          <ul className="divide-y divide-line">
            {areas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {a.name} <Badge tone={a.active ? "success" : "neutral"}>{a.active ? t("admin.areaActive") : t("admin.inactive")}</Badge>
                  </p>
                  <p className="text-xs text-muted">{a.region}</p>
                </div>
                <form action={toggleAreaAction}>
                  <input type="hidden" name="areaId" value={a.id} />
                  <input type="hidden" name="active" value={a.active ? "0" : "1"} />
                  <Button type="submit" size="sm" variant="outline">
                    {a.active ? t("admin.deactivate") : t("admin.activate")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </CardSection>
      </Card>
    </div>
  );
}
