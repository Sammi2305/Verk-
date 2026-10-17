import { createHash, randomBytes } from "node:crypto";

/** 256-bit random token, URL-safe. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only hashes of tokens are stored, so a database leak cannot be replayed. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
