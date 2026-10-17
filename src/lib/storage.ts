import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env } from "@/lib/env";

// Image storage. The local-disk driver keeps files outside /public; they are
// only served through an authorising route handler (/api/myndir/[id]).
// To move to object storage (S3-compatible), replace put/get/remove.

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_REQUEST = 6;
const MAX_DIMENSION = 2000;
const KEY_RE = /^[a-f0-9]{32}\.webp$/;

export type StoredImage = { storageKey: string; mimeType: string; sizeBytes: number; width: number; height: number };

export type ImageCheck = "ok" | "photoType" | "photoTooLarge";

/** Checks magic bytes — the declared MIME type from the browser is not trusted. */
export function checkImageBytes(buf: Buffer): ImageCheck {
  if (buf.length > MAX_UPLOAD_BYTES) return "photoTooLarge";
  const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  return isJpeg || isPng || isWebp ? "ok" : "photoType";
}

function dir() {
  return path.resolve(env().UPLOAD_DIR);
}

function filePath(key: string) {
  if (!KEY_RE.test(key)) throw new Error("Invalid storage key");
  return path.join(dir(), key);
}

/**
 * Re-encodes an uploaded image: applies EXIF orientation, downsizes, and
 * writes WebP. Re-encoding strips all metadata (including GPS position) and
 * neutralises polyglot files. Throws on undecodable input.
 */
export async function storeImage(buf: Buffer): Promise<StoredImage> {
  const { data, info } = await sharp(buf, { limitInputPixels: 50_000_000, failOn: "error" })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const storageKey = `${randomBytes(16).toString("hex")}.webp`;
  await mkdir(dir(), { recursive: true });
  await writeFile(filePath(storageKey), data, { mode: 0o640 });
  return { storageKey, mimeType: "image/webp", sizeBytes: data.length, width: info.width, height: info.height };
}

export async function readImage(key: string): Promise<Buffer> {
  return readFile(filePath(key));
}

export async function removeImage(key: string): Promise<void> {
  await unlink(filePath(key)).catch(() => {});
}
