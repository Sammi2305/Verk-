import Link from "next/link";
import { t } from "@/i18n";
import type { ProfileCard as ProfileCardData } from "@/server/tradespeople";
import { Badge } from "@/components/ui/primitives";
import { BadgeCheckIcon, MapPinIcon, PauseIcon } from "@/components/ui/icons";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={
        size === "lg"
          ? "grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-600 text-xl font-semibold text-white"
          : "grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-base font-semibold text-brand-700"
      }
    >
      {initials(name)}
    </span>
  );
}

export function ProfileCard({ profile, href }: { profile: ProfileCardData; href?: string }) {
  const verified = profile.qualifications.length > 0;
  const areaNames = profile.areas.map((a) => a.area.name);
  return (
    <article className="group relative flex h-full flex-col gap-4 rounded-(--radius-card) border border-line bg-surface p-5 shadow-(--shadow-card) transition hover:border-brand-200 hover:shadow-(--shadow-raised)">
      <div className="flex items-start gap-3.5">
        <Avatar name={profile.businessName} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold break-words text-ink">
            <Link href={href ?? `/fagfolk/${profile.slug}`} className="after:absolute after:inset-0 after:rounded-(--radius-card)">
              {profile.businessName}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted">{profile.categories.map((c) => c.category.nameIs).join(" · ")}</p>
        </div>
      </div>
      {profile.description && <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">{profile.description}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {verified && (
          <Badge tone="success" title={t("profile.verifiedBadgeTitle")}>
            <BadgeCheckIcon className="size-3.5" /> {t("profile.verifiedBadge")}
          </Badge>
        )}
        {!profile.acceptingRequests && (
          <Badge tone="neutral">
            <PauseIcon className="size-3.5" /> {t("profile.pausedShort")}
          </Badge>
        )}
        {areaNames.length > 0 && (
          <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted">
            <MapPinIcon className="size-3.5 shrink-0" />
            <span className="truncate">{areaNames.length > 3 ? `${areaNames.slice(0, 3).join(", ")} +${areaNames.length - 3}` : areaNames.join(", ")}</span>
          </span>
        )}
      </div>
    </article>
  );
}
