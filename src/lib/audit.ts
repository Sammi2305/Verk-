import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Client = Prisma.TransactionClient | typeof db;

/** Records a sensitive action. Pass the transaction client to make it atomic with the change. */
export async function audit(
  entry: { actorId: string | null; action: string; entityType: string; entityId?: string; metadata?: Prisma.InputJsonValue },
  client: Client = db,
) {
  await client.auditLog.create({ data: entry });
}
