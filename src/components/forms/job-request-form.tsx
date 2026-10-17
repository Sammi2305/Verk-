"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { Area, Category } from "@prisma/client";
import { t } from "@/i18n";
import { initialActionState } from "@/lib/action";
import { createJobRequestAction } from "@/app/verkbeidni/actions";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/primitives";
import { BadgeCheckIcon, ImageIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Pro = { id: string; slug: string; businessName: string; verified: boolean; categories: string[]; description: string };

const MAX_PHOTOS = 6;
const MAX_EDGE = 2000;

/** Downscales a photo in the browser so phone pictures upload quickly. Falls back to the original. */
async function downscale(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2_000_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function JobRequestForm({
  categories,
  areas,
  defaults,
  maxInvites,
  minDate,
  photosEnabled,
}: {
  categories: Category[];
  areas: Area[];
  defaults: { categoryId?: string; areaId?: string; preselectSlug?: string };
  maxInvites: number;
  minDate: string;
  photosEnabled: boolean;
}) {
  const [state, dispatch, isPending] = useActionState(createJobRequestAction, initialActionState);
  const v = (state.values ?? {}) as Record<string, string | string[]>;
  const fe = state.fieldErrors ?? {};
  const str = (k: string, d = "") => (typeof v[k] === "string" ? (v[k] as string) : d);

  const [categoryId, setCategoryId] = useState(str("categoryId", defaults.categoryId ?? ""));
  const [areaId, setAreaId] = useState(str("areaId", defaults.areaId ?? ""));
  // Results are keyed by category+area; "loading" is derived, not stored.
  const [result, setResult] = useState<{ key: string; items: Pro[] } | null>(null);
  const [selected, setSelected] = useState<string[]>(Array.isArray(v.profileIds) ? v.profileIds : []);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [processing, setProcessing] = useState(false);
  const preselect = useRef(defaults.preselectSlug);

  const key = categoryId && areaId ? `${categoryId}|${areaId}` : null;
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/fagadilar?flokkur=${encodeURIComponent(categoryId)}&svaedi=${encodeURIComponent(areaId)}`)
      .then((r) => r.json())
      .then((data: { items: Pro[] }) => {
        if (cancelled) return;
        setResult({ key, items: data.items });
        setSelected((prev) => {
          const valid = prev.filter((id) => data.items.some((p) => p.id === id));
          const pre = data.items.find((p) => p.slug === preselect.current);
          preselect.current = undefined;
          if (pre && !valid.includes(pre.id)) valid.unshift(pre.id);
          if (valid.length === 0 && data.items.length === 1) valid.push(data.items[0].id);
          return valid.slice(0, maxInvites);
        });
      })
      .catch(() => !cancelled && setResult({ key, items: [] }));
    return () => {
      cancelled = true;
    };
  }, [key, categoryId, areaId, maxInvites]);
  const pros: Pro[] | "loading" | null = !key ? null : result?.key === key ? result.items : "loading";

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  async function onFiles(list: FileList | null) {
    if (!list) return;
    setProcessing(true);
    const room = MAX_PHOTOS - photos.length;
    const files = await Promise.all([...list].slice(0, room).map(downscale));
    setPhotos((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    setProcessing(false);
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= maxInvites ? prev : [...prev, id]));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("photos");
    photos.forEach((p) => fd.append("photos", p.file));
    startTransition(() => dispatch(fd));
  }

  const proList = Array.isArray(pros) ? pros : [];

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <FormError message={state.error} />

      <Section n={1} title={t("request.stepWhat")}>
        <Field label={t("request.category")} name="categoryId" error={fe.categoryId}>
          <Select name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={fe.categoryId} required>
            <option value="">{t("home.searchCategoryPlaceholder")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameIs}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("request.titleLabel")} name="title" error={fe.title}>
          <Input name="title" maxLength={120} placeholder={t("request.titlePlaceholder")} defaultValue={str("title")} error={fe.title} required />
        </Field>
        <Field label={t("request.description")} name="description" error={fe.description}>
          <Textarea name="description" rows={5} maxLength={5000} placeholder={t("request.descriptionPlaceholder")} defaultValue={str("description")} error={fe.description} required />
        </Field>
        {photosEnabled ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t("request.photos")} <span className="font-normal text-muted">({t("common.optional")})</span>
            </p>
            <p className="text-sm text-muted">{t("request.photosHint", { max: MAX_PHOTOS })}</p>
            <div className="flex flex-wrap gap-3">
              {photos.map((p, i) => (
                <div key={p.url} className="relative size-24 overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-ink/70 text-white hover:bg-ink"
                    aria-label={t("request.removePhoto")}
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="grid size-24 cursor-pointer place-items-center rounded-xl border border-dashed border-line-strong text-muted transition-colors hover:border-brand-600 hover:text-brand-700">
                  <span className="flex flex-col items-center gap-1 text-xs">
                    {processing ? <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <ImageIcon />}
                    {t("request.addPhotos")}
                  </span>
                  <input
                    type="file"
                    name="photos"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      onFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {fe.photos && <p className="text-sm font-medium text-danger-700" role="alert">{fe.photos}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("request.photosUnavailable")}</p>
        )}
      </Section>

      <Section n={2} title={t("request.stepWhere")}>
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <Field label={t("request.address")} name="addressLine" hint={t("request.addressHint")} error={fe.addressLine}>
            <Input name="addressLine" autoComplete="street-address" maxLength={150} placeholder={t("request.addressPlaceholder")} defaultValue={str("addressLine")} error={fe.addressLine} hint required />
          </Field>
          <Field label={t("request.postcode")} name="postcode" error={fe.postcode}>
            <Input name="postcode" inputMode="numeric" autoComplete="postal-code" maxLength={3} placeholder="101" defaultValue={str("postcode")} error={fe.postcode} required />
          </Field>
        </div>
        <Field label={t("request.area")} name="areaId" error={fe.areaId}>
          <Select name="areaId" value={areaId} onChange={(e) => setAreaId(e.target.value)} error={fe.areaId} required>
            <option value="">{t("request.chooseArea")}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("request.preferredFrom")} name="preferredFrom" error={fe.preferredFrom} optional>
            <Input name="preferredFrom" type="date" min={minDate} defaultValue={str("preferredFrom")} error={fe.preferredFrom} />
          </Field>
          <Field label={t("request.preferredTo")} name="preferredTo" error={fe.preferredTo} optional>
            <Input name="preferredTo" type="date" min={minDate} defaultValue={str("preferredTo")} error={fe.preferredTo} />
          </Field>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">{t("request.urgency")}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(["FLEXIBLE", "WITHIN_WEEK", "URGENT"] as const).map((u) => (
              <label key={u} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line-strong px-3.5 py-3 text-sm has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:ring-1 has-checked:ring-brand-600">
                <input type="radio" name="urgency" value={u} defaultChecked={str("urgency", "FLEXIBLE") === u} className="accent-brand-600" />
                {t(`enums.urgency.${u}`)}
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section n={3} title={t("request.stepWho")}>
        <p className="-mt-2 text-sm text-muted">{t("request.chooseTradespeopleHint", { max: maxInvites })}</p>
        {!categoryId || !areaId ? (
          <Alert tone="neutral">{t("request.pickCategoryAreaFirst")}</Alert>
        ) : pros === "loading" ? (
          <p className="text-sm text-muted" role="status">{t("request.loadingTradespeople")}</p>
        ) : Array.isArray(pros) && pros.length === 0 ? (
          <Alert tone="warning" title={t("request.noTradespeopleTitle")}>
            {t("request.noTradespeople")}
          </Alert>
        ) : (
          <ul className="space-y-2" aria-label={t("request.chooseTradespeople")}>
            {proList.map((p) => {
              const checked = selected.includes(p.id);
              const disabled = !checked && selected.length >= maxInvites;
              return (
                <li key={p.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                      checked ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-line-strong hover:bg-subtle",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="profileIds"
                      value={p.id}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(p.id)}
                      className="mt-1 size-5 accent-brand-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium break-words">{p.businessName}</span>
                        {p.verified && (
                          <Badge tone="success">
                            <BadgeCheckIcon className="size-3.5" /> {t("profile.verifiedBadge")}
                          </Badge>
                        )}
                      </span>
                      {p.description && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{p.description}</span>}
                      <a href={`/fagfolk/${p.slug}`} target="_blank" rel="noopener" className="mt-1 inline-block text-sm font-medium text-brand-700 hover:underline">
                        {t("common.view")} →
                      </a>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {fe.profileIds && <p className="text-sm font-medium text-danger-700" role="alert">{fe.profileIds}</p>}
      </Section>

      <div className="space-y-3 border-t border-line pt-6">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending || processing || selected.length === 0}>
          {isPending && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
          {isPending ? t("request.submitting") : t("request.submit")}
        </Button>
        <p className="text-sm text-muted">{t("request.freeNote")}</p>
      </div>
    </form>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="flex items-center gap-3 text-lg font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-brand-600 text-sm text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
