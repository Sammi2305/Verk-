import { z } from "zod";

// Shared, server-authoritative validation rules. Client forms may reuse them,
// but the server always re-validates.

/** Icelandic phone numbers: 7 digits, optional +354/00354 prefix. Landlines start
 * with 4/5, mobiles with 6/7/8. Returns the normalised 7-digit form or null. */
export function normalizeIcelandicPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^(\+354|00354)/, "");
  return /^[4-8]\d{6}$/.test(digits) ? digits : null;
}

/** Validates an Icelandic kennitala (personal or company) via its check digit. */
export function isValidKennitala(input: string): boolean {
  const kt = input.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(kt)) return false;
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(kt[i]), 0);
  const remainder = sum % 11;
  const check = remainder === 0 ? 0 : 11 - remainder;
  if (check === 10) return false;
  return check === Number(kt[8]) && (kt[9] === "9" || kt[9] === "0" || kt[9] === "8");
}

export function normalizeKennitala(input: string): string {
  return input.replace(/[\s-]/g, "");
}

/** Icelandic postcodes are three digits, 101–902. */
export function isValidPostcode(input: string): boolean {
  return /^\d{3}$/.test(input) && Number(input) >= 101 && Number(input) <= 902;
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("invalidEmail");

export const passwordSchema = z.string().min(10, "passwordTooShort").max(200, "passwordTooLong");

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeIcelandicPhone(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalidPhone" });
      return z.NEVER;
    }
    return n;
  });

export const optionalPhoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = normalizeIcelandicPhone(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalidPhone" });
      return z.NEVER;
    }
    return n;
  });

export const postcodeSchema = z
  .string()
  .trim()
  .refine(isValidPostcode, "invalidPostcode");

export const nameSchema = z.string().trim().min(2, "nameTooShort").max(100, "tooLong");

/** Collapses a FormData into a plain object; repeated keys become arrays. */
export function formDataToObject(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value !== "string" || key.startsWith("$ACTION")) continue;
    const prev = out[key];
    if (prev === undefined) out[key] = value;
    else out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return out;
}
