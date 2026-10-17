// Icelandic formatting helpers. Safe for both server and client code.

/** IANA zone for Iceland. (The project brief says "Europe/Reykjavik"; the
 * canonical IANA name is Atlantic/Reykjavik, which is UTC+0 with no DST.) */
export const TIME_ZONE = "Atlantic/Reykjavik";
export const LOCALE = "is-IS";

const iskFormatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "ISK", maximumFractionDigits: 0 });

export function formatIsk(amount: number): string {
  return iskFormatter.format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE }).format(
    new Date(date),
  );
}

export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: TIME_ZONE }).format(new Date(date));
}

export function formatWeekdayDate(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE }).format(
    new Date(date),
  );
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }).format(
    new Date(date),
  );
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} kl. ${formatTime(date)}`;
}

export function formatTimeRange(start: Date | string, end: Date | string): string {
  return `${formatWeekdayDate(start)}, kl. ${formatTime(start)}–${formatTime(end)}`;
}

/** Formats a 7-digit Icelandic phone number as "123 4567". */
export function formatPhone(phone: string): string {
  return phone.length === 7 ? `${phone.slice(0, 3)} ${phone.slice(3)}` : phone;
}

/**
 * Converts the value of an <input type="datetime-local"> (wall-clock time in
 * Iceland) to a Date. Iceland has been UTC+0 without DST since 1968, so the
 * wall-clock time equals UTC.
 */
export function parseIcelandLocalDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inverse of parseIcelandLocalDateTime, for pre-filling inputs. */
export function toIcelandLocalInput(date: Date): string {
  return date.toISOString().slice(0, 16);
}

/** Parses an <input type="date"> value as a calendar date (UTC midnight). */
export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function todayInIceland(): string {
  return new Date().toISOString().slice(0, 10);
}
