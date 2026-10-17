import { t } from "@/i18n";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/primitives";
import { Table, Td } from "../admin-ui";

export default async function AdminAuditPage() {
  await requireAdmin("/stjornbord/atvikaskra");
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { name: true, email: true } } } });
  if (logs.length === 0) return <EmptyState title={t("admin.noResults")} />;
  return (
    <Table head={[t("common.date"), t("admin.auditActor"), t("admin.auditAction"), t("admin.auditEntity"), t("common.details")]} minWidth="60rem">
      {logs.map((l) => (
        <tr key={l.id}>
          <Td className="whitespace-nowrap">{formatDateTime(l.createdAt)}</Td>
          <Td>{l.actor ? l.actor.name : "—"}</Td>
          <Td>
            <code className="text-xs">{l.action}</code>
          </Td>
          <Td>
            <code className="text-xs">
              {l.entityType}:{l.entityId?.slice(0, 10)}
            </code>
          </Td>
          <Td>
            <code className="block max-w-md text-xs break-all whitespace-pre-wrap text-muted">{l.metadata ? JSON.stringify(l.metadata) : ""}</code>
          </Td>
        </tr>
      ))}
    </Table>
  );
}
