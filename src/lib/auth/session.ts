import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { generateToken, hashToken } from "./tokens";

const SESSION_DAYS = 30;
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";
// __Host- prefix forces Secure, Path=/ and no Domain in production.
export const SESSION_COOKIE = isProd ? "__Host-vv_session" : "vv_session";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  emailNotifications: boolean;
  sessionId: string;
};

export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt, userAgent } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Returns the signed-in user, or null. Cached for the duration of a request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now || session.user.status !== "ACTIVE") {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  // Sliding expiry, renewed at most once a day to keep writes cheap.
  if (now - session.lastSeenAt.getTime() > RENEW_AFTER_MS) {
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(now), expiresAt: new Date(now + SESSION_DAYS * 86400_000) },
    });
  }
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    emailVerified: u.emailVerifiedAt !== null,
    emailNotifications: u.emailNotifications,
    sessionId: session.id,
  };
});

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}
