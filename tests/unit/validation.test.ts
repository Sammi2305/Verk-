import { describe, expect, it } from "vitest";
import { isValidKennitala, isValidPostcode, normalizeIcelandicPhone } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { safeNext } from "@/lib/auth/guards";

describe("Icelandic validation", () => {
  it("normalises phone numbers", () => {
    expect(normalizeIcelandicPhone("+354 612 3456")).toBe("6123456");
    expect(normalizeIcelandicPhone("00354-5551234")).toBe("5551234");
    expect(normalizeIcelandicPhone("861-2345")).toBe("8612345");
    expect(normalizeIcelandicPhone("1234567")).toBeNull(); // no Icelandic numbers start with 1
    expect(normalizeIcelandicPhone("612345")).toBeNull();
    expect(normalizeIcelandicPhone("61234567")).toBeNull();
  });

  it("validates kennitala check digits", () => {
    expect(isValidKennitala("010130-3019")).toBe(true); // well-known test kennitala
    expect(isValidKennitala("0101303019")).toBe(true);
    expect(isValidKennitala("0101303029")).toBe(false);
    expect(isValidKennitala("123")).toBe(false);
  });

  it("validates postcodes", () => {
    expect(isValidPostcode("101")).toBe(true);
    expect(isValidPostcode("220")).toBe(true);
    expect(isValidPostcode("099")).toBe(false);
    expect(isValidPostcode("1010")).toBe(false);
  });

  it("slugifies Icelandic text", () => {
    expect(slugify("Pípulagnir Þórs ehf.")).toBe("pipulagnir-thors-ehf");
    expect(slugify("Garðabær")).toBe("gardabaer");
    expect(slugify("Ölgerð & Æðarvarp")).toBe("olgerd-aedarvarp");
  });

  it("only allows safe relative redirects", () => {
    expect(safeNext("/minar-sidur")).toBe("/minar-sidur");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext(undefined, "/x")).toBe("/x");
  });
});
