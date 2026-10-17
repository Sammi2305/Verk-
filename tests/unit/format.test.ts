import { describe, expect, it } from "vitest";
import { formatIsk, formatDate, formatTime, formatPhone, parseIcelandLocalDateTime, toIcelandLocalInput } from "@/lib/format";

describe("Icelandic formatting", () => {
  it("formats ISK without decimals", () => {
    expect(formatIsk(990)).toBe("990\u00a0kr.");
    expect(formatIsk(5990)).toBe("5.990\u00a0kr.");
    expect(formatIsk(1234567)).toBe("1.234.567\u00a0kr.");
  });

  it("formats dates and 24-hour times in Reykjavík time", () => {
    const d = new Date("2026-12-24T18:05:00Z");
    expect(formatDate(d)).toBe("24. desember 2026");
    expect(formatTime(d)).toBe("18:05");
    expect(formatTime(new Date("2026-06-01T00:30:00Z"))).toBe("00:30");
  });

  it("round-trips datetime-local values (Iceland is UTC+0, no DST)", () => {
    const d = parseIcelandLocalDateTime("2026-07-01T09:30");
    expect(d?.toISOString()).toBe("2026-07-01T09:30:00.000Z");
    expect(toIcelandLocalInput(d!)).toBe("2026-07-01T09:30");
    expect(parseIcelandLocalDateTime("not a date")).toBeNull();
  });

  it("formats phone numbers", () => {
    expect(formatPhone("6123456")).toBe("612 3456");
  });
});
