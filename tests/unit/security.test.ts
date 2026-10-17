import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkImageBytes } from "@/lib/storage";
import { relevanceScore, dailyTieBreak, type ProfileCard } from "@/server/tradespeople";

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("wrong", a)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("upload checks", () => {
  it("accepts real images by magic bytes and rejects others", async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).png().toBuffer();
    const jpg = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).jpeg().toBuffer();
    expect(checkImageBytes(png)).toBe("ok");
    expect(checkImageBytes(jpg)).toBe("ok");
    expect(checkImageBytes(Buffer.from("<svg onload=alert(1)>"))).toBe("photoType");
    expect(checkImageBytes(Buffer.from("GIF89a......"))).toBe("photoType");
    expect(checkImageBytes(Buffer.alloc(9 * 1024 * 1024, 0xff))).toBe("photoTooLarge");
  });
});

describe("search ranking", () => {
  const base = {
    id: "a",
    businessName: "Pípulagnir",
    description: "Lagnir og leki",
    acceptingRequests: true,
    qualifications: [],
  } as unknown as ProfileCard;

  it("ignores subscription plan entirely (the score only reads profile facts)", () => {
    const withPlan = { ...base, subscription: { planCode: "PRO" } } as unknown as ProfileCard;
    expect(relevanceScore(withPlan, undefined, undefined)).toBe(relevanceScore(base, undefined, undefined));
  });

  it("ranks verified, available profiles higher", () => {
    const verified = { ...base, qualifications: [{ categoryId: null }] } as unknown as ProfileCard;
    const paused = { ...base, acceptingRequests: false } as unknown as ProfileCard;
    expect(relevanceScore(verified, undefined, undefined)).toBeGreaterThan(relevanceScore(base, undefined, undefined));
    expect(relevanceScore(paused, undefined, undefined)).toBeLessThan(relevanceScore(base, undefined, undefined));
  });

  it("rotates tie-breaks daily", () => {
    expect(dailyTieBreak("x", "2026-01-01")).not.toBe(dailyTieBreak("x", "2026-01-02"));
    expect(dailyTieBreak("x", "2026-01-01")).toBe(dailyTieBreak("x", "2026-01-01"));
  });
});
