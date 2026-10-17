import { is } from "./messages/is";

// Centralised localisation. Icelandic is the primary (and currently only)
// locale; an `en` dictionary can be added with the same shape later.
// Usage: t("booking.status.SCHEDULED"), t("search.resultCount", { count: 3 }).

type Dict = typeof is;
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Dict>;
export type Locale = "is";

const dictionaries: Record<Locale, Dict> = { is };

export function t(key: MessageKey, params?: Record<string, string | number>, locale: Locale = "is"): string {
  let node: unknown = dictionaries[locale];
  for (const part of key.split(".")) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  if (typeof node !== "string") {
    if (process.env.NODE_ENV !== "production") throw new Error(`Missing message: ${key}`);
    return key;
  }
  if (!params) return node;
  return node.replace(/\{(\w+)\}/g, (_, name: string) => (name in params ? String(params[name]) : `{${name}}`));
}

/** Translates a validation error code if it is a known message key under `errors.`. */
export function tError(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const errors = is.errors as Record<string, string>;
  return errors[code] ?? code;
}

export const siteName = is.site.name;
