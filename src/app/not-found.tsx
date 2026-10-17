import { t } from "@/i18n";
import { Container, EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { SearchIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <Container className="max-w-xl py-20">
      <EmptyState icon={<SearchIcon />} title={t("errors.notFound")} action={<ButtonLink href="/">{t("errors.goHome")}</ButtonLink>}>
        {t("errors.notFoundText")}
      </EmptyState>
    </Container>
  );
}
