"use server";

import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { type ActionState, UserError } from "@/lib/action";
import { requireUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { fieldErrorsFrom } from "@/lib/zod-errors";
import { formDataToObject } from "@/lib/validation";
import { checkImageBytes, MAX_PHOTOS_PER_REQUEST, MAX_UPLOAD_BYTES, removeImage, storeImage, type StoredImage } from "@/lib/storage";
import { createJobRequest, jobRequestSchema } from "@/server/job-requests";

export async function createJobRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/verkbeidni/ny");
  const raw = formDataToObject(formData);
  const profileIds = formData.getAll("profileIds").filter((v): v is string => typeof v === "string");
  const { photos: _photos, ...rest } = raw;
  void _photos;
  const values = { ...rest, profileIds };
  if (user.role !== "CUSTOMER") return { error: t("errors.forbidden"), values };
  if (!(await rateLimit(`request:create:${user.id}`, 10, 3600))) return { error: t("errors.rateLimited"), values };

  const parsed = jobRequestSchema.safeParse({ ...rest, profileIds });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS_PER_REQUEST) {
    return { fieldErrors: { photos: t("errors.tooManyPhotos", { max: MAX_PHOTOS_PER_REQUEST }) }, values };
  }
  const stored: StoredImage[] = [];
  try {
    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) throw new UserError(t("errors.photoTooLarge", { mb: MAX_UPLOAD_BYTES / 1024 / 1024 }));
      const buf = Buffer.from(await file.arrayBuffer());
      const check = checkImageBytes(buf);
      if (check === "photoType") throw new UserError(t("errors.photoType"));
      if (check === "photoTooLarge") throw new UserError(t("errors.photoTooLarge", { mb: MAX_UPLOAD_BYTES / 1024 / 1024 }));
      try {
        stored.push(await storeImage(buf));
      } catch {
        throw new UserError(t("errors.photoInvalid"));
      }
    }
  } catch (err) {
    await Promise.all(stored.map((s) => removeImage(s.storageKey)));
    if (err instanceof UserError) return { fieldErrors: { photos: err.message }, values };
    throw err;
  }

  let id: string;
  try {
    const request = await createJobRequest({ id: user.id, emailVerified: user.emailVerified }, parsed.data, stored);
    id = request.id;
  } catch (err) {
    if (err instanceof UserError) return { error: err.message, fieldErrors: err.fieldErrors, values };
    throw err;
  }
  redirect(`/minar-sidur/beidnir/${id}?ny=1`);
}
