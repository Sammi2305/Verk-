import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { devOutboxEnabled } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { Alert, Badge, Card, Container, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: t("admin.outbox"), robots: { index: false, follow: false } };

/**
 * DEVELOPMENT ONLY. Shows e-mails captured by the "outbox" mail driver so the
 * registration and notification flows can be tested without sending real
 * e-mail. Returns 404 in production or unless ENABLE_DEV_OUTBOX=true.
 */
export default async function DevOutboxPage() {
  if (!devOutboxEnabled()) notFound();
  const emails = await db.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <Container className="py-10">
      <PageHeader title={t("admin.outbox")} eyebrow={<Badge tone="warning">{t("common.testMode")}</Badge>} />
      <Alert tone="warning" className="mb-6">
        {t("admin.outboxNotice")}
      </Alert>
      {emails.length === 0 ? (
        <EmptyState title={t("admin.outboxEmpty")} />
      ) : (
        <div className="space-y-4">
          {emails.map((e) => (
            <Card key={e.id} className="p-5" data-testid="outbox-email">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{e.subject}</p>
                <Badge tone="warning">{t(`enums.emailStatus.${e.status}`)}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {e.toEmail} · {formatDateTime(e.createdAt)}
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-subtle p-3 text-sm whitespace-pre-wrap">
                {e.textBody.split(/(https?:\/\/\S+)/g).map((part, i) =>
                  /^https?:\/\//.test(part) ? (
                    <a key={i} href={part} className="text-brand-700 underline">
                      {part}
                    </a>
                  ) : (
                    part
                  ),
                )}
              </pre>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
