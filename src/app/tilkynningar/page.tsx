import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { Container, EmptyState, PageHeader } from "@/components/ui/primitives";
import { BellIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: t("dashboard.notificationsTitle"), robots: { index: false } };

export default async function NotificationsPage() {
  const user = await requireUser("/tilkynningar");
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  // Viewing the list marks everything as read; the dots below still show what was new.
  if (items.some((n) => !n.readAt)) {
    await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  }
  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <PageHeader title={t("dashboard.notificationsTitle")} />
      {items.length === 0 ? (
        <EmptyState icon={<BellIcon />} title={t("dashboard.notificationsEmpty")} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-(--radius-card) border border-line bg-surface">
          {items.map((n) => {
            const inner = (
              <div className="flex gap-3 px-5 py-4">
                <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-accent-500"}`} />
                <div className="min-w-0">
                  <p className={`break-words ${n.readAt ? "text-ink-soft" : "font-medium text-ink"}`}>{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted">{formatDateTime(n.createdAt)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.href?.startsWith("/") ? (
                  <Link href={n.href} className="block hover:bg-subtle">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
