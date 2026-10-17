import "server-only";
import type { PlanCode, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { t } from "@/i18n";
import { formatIsk } from "@/lib/format";

type Client = Prisma.TransactionClient | typeof db;

export async function getSettings(client: Client = db) {
  return (
    (await client.platformSettings.findUnique({ where: { id: 1 } })) ??
    (await client.platformSettings.create({ data: { id: 1 } }))
  );
}

export async function getPlans(client: Client = db) {
  return client.plan.findMany({ orderBy: { monthlyPriceIsk: "asc" } });
}

export async function getPlan(code: PlanCode, client: Client = db) {
  return client.plan.findUniqueOrThrow({ where: { code } });
}

/** e.g. "990 kr. (án vsk.)" — always states whether VAT is included. */
export function priceWithVatLabel(amount: number, includesVat: boolean): { amount: string; vat: string } {
  return { amount: formatIsk(amount), vat: includesVat ? t("common.vatIncluded") : t("common.vatExcluded") };
}
