import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { formatShortDate } from "@/lib/format";
import { setUserStatusAction, verifyEmailAction } from "../actions";
import { Badge } from "@/components/ui/primitives";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { DecisionForm } from "@/components/forms/admin-forms";
import { Table, Td } from "../admin-ui";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin("/stjornbord/notendur");
  const { q } = await searchParams;
  const query = q?.trim().slice(0, 100);
  const users = await db.user.findMany({
    where: {
      status: { not: "DELETED" },
      ...(query ? { OR: [{ email: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-5">
      <form method="get" className="flex max-w-md gap-2" role="search">
        <Input name="q" type="search" defaultValue={query ?? ""} aria-label={t("search.apply")} />
        <Button type="submit" variant="outline">
          {t("search.apply")}
        </Button>
      </form>
      <Table head={[t("auth.name"), t("auth.email"), t("common.status"), t("common.created"), t("common.actions")]} minWidth="56rem">
        {users.map((u) => (
          <tr key={u.id}>
            <Td>
              {u.name}
              <span className="block text-xs text-muted">{t(`enums.role.${u.role}`)}</span>
            </Td>
            <Td>
              {u.email}
              {!u.emailVerifiedAt && <span className="block text-xs text-warning-700">{t("admin.emailUnverified")}</span>}
              {!u.emailVerifiedAt && u.status === "ACTIVE" && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-brand-700">{t("admin.verifyEmail")}</summary>
                  <div className="mt-2">
                    <DecisionForm
                      action={verifyEmailAction}
                      hidden={{ userId: u.id }}
                      buttonName="confirm"
                      noteLabel={t("admin.verifyEmailNote")}
                      buttons={[{ value: "1", label: t("admin.verifyEmail"), variant: "primary" }]}
                    />
                  </div>
                </details>
              )}
            </Td>
            <Td>
              <Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>{t(`enums.userStatus.${u.status}`)}</Badge>
            </Td>
            <Td className="whitespace-nowrap">{formatShortDate(u.createdAt)}</Td>
            <Td className="min-w-64">
              {u.id !== admin.id && u.role !== "ADMIN" && (
                <DecisionForm
                  action={setUserStatusAction}
                  hidden={{ userId: u.id }}
                  buttonName="status"
                  noteLabel={t("common.reason")}
                  buttons={
                    u.status === "ACTIVE"
                      ? [{ value: "SUSPENDED", label: t("admin.suspendUser"), variant: "danger" }]
                      : [{ value: "ACTIVE", label: t("admin.reactivateUser") }]
                  }
                />
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
