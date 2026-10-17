import type { BookingStatus, InvitationStatus, JobRequestStatus, PriceType, ProfileStatus } from "@prisma/client";
import { t } from "@/i18n";
import { formatIsk } from "@/lib/format";
import { Badge } from "@/components/ui/primitives";

type Tone = Parameters<typeof Badge>[0]["tone"];

const bookingTone: Record<BookingStatus, Tone> = {
  ACCEPTED: "info",
  SCHEDULED: "brand",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
  CANCELLED: "neutral",
  DISPUTED: "danger",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={bookingTone[status]}>{t(`enums.bookingStatus.${status}`)}</Badge>;
}

const requestTone: Record<JobRequestStatus, Tone> = { DRAFT: "warning", SUBMITTED: "info", BOOKED: "brand", CANCELLED: "neutral" };

export function RequestStatusBadge({ status }: { status: JobRequestStatus }) {
  return <Badge tone={requestTone[status]}>{t(`enums.requestStatus.${status}`)}</Badge>;
}

const invitationTone: Record<InvitationStatus, Tone> = {
  PENDING: "info",
  ACCEPTED: "brand",
  DECLINED: "neutral",
  SELECTED: "success",
  NOT_SELECTED: "neutral",
};

export function InvitationStatusBadge({ status, audience }: { status: InvitationStatus; audience: "customer" | "pro" }) {
  const label = audience === "pro" ? t(`enums.invitationStatusPro.${status}`) : t(`enums.invitationStatus.${status}`);
  return <Badge tone={audience === "pro" && status === "PENDING" ? "accent" : invitationTone[status]}>{label}</Badge>;
}

const profileTone: Record<ProfileStatus, Tone> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

export function ProfileStatusBadge({ status }: { status: ProfileStatus }) {
  return <Badge tone={profileTone[status]}>{t(`enums.profileStatus.${status}`)}</Badge>;
}

/** Always shows the price *type* so customers know if a price is fixed, estimated, hourly or after inspection. */
export function PriceText({ type, amount }: { type: PriceType; amount: number | null }) {
  if (type === "INSPECTION" || amount === null) return <>{t("price.INSPECTION")}</>;
  return <>{t(`price.${type}`, { amount: formatIsk(amount) })}</>;
}
