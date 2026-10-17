import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { Container, PageHeader } from "@/components/ui/primitives";
import { ArrowRightIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: t("categories.title"), description: t("categories.intro"), alternates: { canonical: "/flokkar" } };

export default async function CategoriesPage() {
  const categories = await db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader title={t("categories.title")} description={t("categories.intro")} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="min-w-0">
            <Link
              href={`/flokkar/${c.slug}`}
              className="group flex h-full items-center justify-between gap-4 rounded-(--radius-card) border border-line bg-surface p-5 shadow-(--shadow-card) transition hover:border-brand-200 hover:shadow-(--shadow-raised)"
            >
              <span className="min-w-0">
                <span className="block font-medium break-words text-ink">{c.nameIs}</span>
                {c.descriptionIs && <span className="mt-1 block text-sm text-muted">{c.descriptionIs}</span>}
              </span>
              <ArrowRightIcon className="size-4.5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
