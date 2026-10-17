import { t } from "@/i18n";
import type { LegalDoc } from "@/i18n/content/legal-is";
import { formatDate } from "@/lib/format";
import { Alert, Container } from "@/components/ui/primitives";

export function LegalPage({ title, doc }: { title: string; doc: LegalDoc }) {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        {t("common.updated")}: {formatDate(doc.updated)}
      </p>
      <Alert tone="warning" className="mt-6">
        {t("legal.draftNotice")}
      </Alert>
      <div className="mt-8 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </Container>
  );
}
