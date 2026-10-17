import type { BookingSource, PlanCode } from "@prisma/client";

export type FeeDecision =
  | { eligible: true; amountIsk: number; reason: "BASIC_PLATFORM_JOB" }
  | { eligible: false; amountIsk: 0; reason: "INDEPENDENT_CUSTOMER" | "PRO_PLAN" | "ZERO_FEE" };

/**
 * The platform-fee rule, in one place. Called only when a booking becomes
 * COMPLETED (customer-confirmed or admin-resolved). Cancelled, declined and
 * disputed-then-cancelled jobs never reach this function, so they are never
 * fee-bearing. There is no percentage commission and materials are never
 * part of the calculation.
 */
export function decideFee(input: { source: BookingSource; planCode: PlanCode; perJobFeeIsk: number }): FeeDecision {
  if (input.source === "INDEPENDENT") return { eligible: false, amountIsk: 0, reason: "INDEPENDENT_CUSTOMER" };
  if (input.planCode === "PRO") return { eligible: false, amountIsk: 0, reason: "PRO_PLAN" };
  if (input.perJobFeeIsk <= 0) return { eligible: false, amountIsk: 0, reason: "ZERO_FEE" };
  return { eligible: true, amountIsk: input.perJobFeeIsk, reason: "BASIC_PLATFORM_JOB" };
}
