import { describe, expect, it } from "vitest";
import { decideFee } from "@/server/fees";

describe("platform fee rule", () => {
  it("charges the configured fee for completed Basic platform jobs", () => {
    expect(decideFee({ source: "PLATFORM", planCode: "BASIC", perJobFeeIsk: 990 })).toEqual({ eligible: true, amountIsk: 990, reason: "BASIC_PLATFORM_JOB" });
  });
  it("never charges for independently acquired customers", () => {
    expect(decideFee({ source: "INDEPENDENT", planCode: "BASIC", perJobFeeIsk: 990 }).eligible).toBe(false);
  });
  it("never charges per job on Pro", () => {
    expect(decideFee({ source: "PLATFORM", planCode: "PRO", perJobFeeIsk: 990 })).toMatchObject({ eligible: false, reason: "PRO_PLAN" });
  });
  it("treats a zero fee as not eligible", () => {
    expect(decideFee({ source: "PLATFORM", planCode: "BASIC", perJobFeeIsk: 0 })).toMatchObject({ eligible: false, reason: "ZERO_FEE" });
  });
});
