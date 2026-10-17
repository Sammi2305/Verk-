import type { Area, Category, JobRequest } from "@prisma/client";
import { t } from "@/i18n";
import { formatDate } from "@/lib/format";
import { DetailRow } from "@/components/ui/primitives";

/** Shared description of a job request. Pass `address` only to authorised viewers. */
export function RequestSummary({
  request,
  address,
}: {
  request: Pick<JobRequest, "description" | "postcode" | "preferredFrom" | "preferredTo" | "urgency"> & { category: Category; area: Area };
  address?: string;
}) {
  const dates =
    request.preferredFrom || request.preferredTo
      ? [request.preferredFrom && formatDate(request.preferredFrom), request.preferredTo && formatDate(request.preferredTo)].filter(Boolean).join(" – ")
      : t("request.anyTime");
  return (
    <dl className="divide-y divide-line">
      <DetailRow label={t("request.category")}>{request.category.nameIs}</DetailRow>
      <DetailRow label={t("request.location")}>
        {address ? `${address}, ` : ""}
        {request.postcode} · {request.area.name}
      </DetailRow>
      <DetailRow label={t("request.urgency")}>{t(`enums.urgency.${request.urgency}`)}</DetailRow>
      <DetailRow label={t("request.preferredDates")}>{dates}</DetailRow>
      <DetailRow label={t("request.description")}>
        <p className="leading-relaxed whitespace-pre-line">{request.description}</p>
      </DetailRow>
    </dl>
  );
}
