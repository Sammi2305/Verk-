"use client";

import { t } from "@/i18n";
import { Container, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { AlertIcon } from "@/components/ui/icons";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="max-w-xl py-20">
      <EmptyState icon={<AlertIcon />} title={t("errors.generic")} action={<Button onClick={reset}>{t("errors.tryAgain")}</Button>}>
        {t("errors.serverError")}
      </EmptyState>
    </Container>
  );
}
