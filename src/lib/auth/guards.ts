import "server-only";
import { redirect, notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "./session";

// Server-side authorization helpers. Every page and server action that needs
// a signed-in user calls one of these; nothing relies on client-side checks.

export class AuthorizationError extends Error {
  constructor(message = "forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/innskraning?next=${encodeURIComponent(next)}` : "/innskraning");
  return user;
}

export async function requireRole(role: Role, next?: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  // Non-matching roles get a 404 so that admin routes are not even revealed.
  if (user.role !== role) notFound();
  return user;
}

export const requireAdmin = (next?: string) => requireRole("ADMIN", next);

export async function requireTradesperson(next?: string) {
  const user = await requireRole("TRADESPERSON", next);
  const profile = await db.tradespersonProfile.findUnique({ where: { userId: user.id } });
  if (!profile) notFound();
  return { user, profile };
}

/** Only allow same-site relative redirects after login, never open redirects. */
export function safeNext(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function homeForRole(role: Role): string {
  return role === "ADMIN" ? "/stjornbord" : role === "TRADESPERSON" ? "/fagadili" : "/minar-sidur";
}
