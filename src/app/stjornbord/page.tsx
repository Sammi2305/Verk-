import Link from "next/link";
import { t } from "@/i18n";
import { requireAdmin } from "@/lib/auth/guards";
import { formatIsk } from "@/lib/format";
import { adminStats } from "@/server/admin";
import { Card, CardSection } from "@/components/ui/primitives";

export default async function AdminOverview() {
  await requireAdmin("/stjornbord");
  const s = await adminStats();
  const tiles = [
    { label: t("admin.statsPendingProfiles"), value: s.pendingProfiles, href: "/stjornbord/fagadilar", alert: s.pendingProfiles > 0 },
    { label: t("admin.statsPendingQualifications"), value: s.pendingQualifications, href: "/stjornbord/fagadilar?stada=APPROVED", alert: s.pendingQualifications > 0 },
    { label: t("admin.statsOpenDisputes"), value: s.openDisputes, href: "/stjornbord/bokanir?stada=DISPUTED", alert: s.openDisputes > 0 },
    { label: t("admin.statsActiveBookings"), value: s.activeBookings, href: "/stjornbord/bokanir" },
    { label: t("admin.statsCompletedBookings"), value: s.completedBookings, href: "/stjornbord/bokanir?stada=COMPLETED" },
    { label: t("admin.statsUsers"), value: s.users, href: "/stjornbord/notendur" },
    { label: t("admin.statsRecordedFees"), value: formatIsk(s.recordedFeesIsk), href: "/stjornbord/gjold" },
  ];
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.label}>
          <Link href={tile.href} className="block h-full">
            <Card className={`h-full transition hover:shadow-(--shadow-raised) ${tile.alert ? "ring-2 ring-accent-500" : ""}`}>
              <CardSection>
                <p className="text-sm text-muted">{tile.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{tile.value}</p>
              </CardSection>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
