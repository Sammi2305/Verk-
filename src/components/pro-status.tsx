import Link from "next/link";
import type { TradespersonProfile } from "@prisma/client";
import { t } from "@/i18n";
import { Alert } from "@/components/ui/primitives";

export function ProfileStatusAlert({ profile }: { profile: TradespersonProfile }) {
  switch (profile.status) {
    case "DRAFT":
      return (
        <Alert tone="info" action={<Link href="/fagadili/profill">{t("pro.profileTitle")} →</Link>}>
          {t("pro.statusDraft")}
        </Alert>
      );
    case "PENDING_REVIEW":
      return <Alert tone="info">{t("pro.statusPending")}</Alert>;
    case "APPROVED":
      return (
        <Alert tone="success" action={<Link href={`/fagfolk/${profile.slug}`}>{t("pro.viewPublic")} →</Link>}>
          {t("pro.statusApproved")}
        </Alert>
      );
    case "REJECTED":
      return (
        <Alert tone="danger" title={t("pro.statusRejected")} action={<Link href="/fagadili/profill">{t("pro.profileTitle")} →</Link>}>
          {profile.reviewNote && (
            <>
              <strong>{t("pro.reviewNote")}:</strong> {profile.reviewNote}
            </>
          )}
        </Alert>
      );
    case "SUSPENDED":
      return <Alert tone="danger">{t("pro.statusSuspended")}</Alert>;
  }
}
