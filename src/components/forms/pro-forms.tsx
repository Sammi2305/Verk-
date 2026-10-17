"use client";

import { useActionState } from "react";
import type { Area, Category } from "@prisma/client";
import { t } from "@/i18n";
import { initialActionState } from "@/lib/action";
import { addQualificationAction, saveProfileAction } from "@/app/fagadili/actions";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/primitives";

type ProfileFormProps = {
  profile: {
    businessName: string;
    description: string;
    publicPhone: string | null;
    yearsExperience: number | null;
    categoryIds: string[];
    areaIds: string[];
    canSubmit: boolean;
  };
  categories: Category[];
  areas: Area[];
};

export function ProfileForm({ profile, categories, areas }: ProfileFormProps) {
  const [state, action] = useActionState(saveProfileAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  // After a failed submit, re-fill with what the user typed (React resets forms after actions).
  const v = state.ok ? undefined : state.values;
  const str = (key: string, fallback: string) => (typeof v?.[key] === "string" ? (v[key] as string) : fallback);
  const list = (key: string, fallback: string[]) => (v ? ([] as string[]).concat(v[key] ?? []) : fallback);
  const categoryIds = list("categoryIds", profile.categoryIds);
  const areaIds = list("areaIds", profile.areaIds);
  return (
    <form action={action} className="space-y-6" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <FormError message={state.error} />
      <Field label={t("pro.businessName")} name="businessName" error={fe.businessName}>
        <Input name="businessName" required defaultValue={str("businessName", profile.businessName)} error={fe.businessName} />
      </Field>
      <Field label={t("pro.description")} name="description" hint={t("pro.descriptionHint")} error={fe.description}>
        <Textarea name="description" rows={6} maxLength={3000} defaultValue={str("description", profile.description)} error={fe.description} hint />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t("pro.publicPhone")} name="publicPhone" hint={t("pro.publicPhoneHint")} error={fe.publicPhone} optional>
          <Input name="publicPhone" type="tel" inputMode="tel" defaultValue={str("publicPhone", profile.publicPhone ?? "")} error={fe.publicPhone} hint />
        </Field>
        <Field label={t("pro.yearsExperience")} name="yearsExperience" error={fe.yearsExperience} optional>
          <Input name="yearsExperience" type="number" min={0} max={70} inputMode="numeric" defaultValue={str("yearsExperience", profile.yearsExperience?.toString() ?? "")} error={fe.yearsExperience} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">{t("pro.categories")}</legend>
        <p className="mt-1 text-sm text-muted">{t("pro.categoriesHint")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {categories.map((c) => (
            <Checkbox key={c.id} name="categoryIds" value={c.id} defaultChecked={categoryIds.includes(c.id)} label={c.nameIs} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">{t("pro.areas")}</legend>
        <p className="mt-1 text-sm text-muted">{t("pro.areasHint")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {areas.map((a) => (
            <Checkbox key={a.id} name="areaIds" value={a.id} defaultChecked={areaIds.includes(a.id)} label={a.name} />
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row">
        {profile.canSubmit && (
          <SubmitButton name="submit" value="1" pendingText={t("common.saving")}>
            {t("pro.submitForReview")}
          </SubmitButton>
        )}
        <SubmitButton variant={profile.canSubmit ? "outline" : "primary"} pendingText={t("common.saving")}>
          {t("pro.saveProfile")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function QualificationForm({ categories }: { categories: Category[] }) {
  const [state, action] = useActionState(addQualificationAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("pro.qualType")} name="type" error={fe.type}>
          <Select name="type" defaultValue={(state.values?.type as string) ?? "JOURNEYMAN"}>
            {(["JOURNEYMAN", "MASTER", "LICENSE", "INSURANCE", "OTHER"] as const).map((v) => (
              <option key={v} value={v}>
                {t(`enums.qualificationType.${v}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("pro.qualCategory")} name="categoryId" optional>
          <Select name="categoryId" defaultValue={(state.values?.categoryId as string) ?? ""}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameIs}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("pro.qualTitle")} name="title" error={fe.title}>
        <Input name="title" placeholder={t("pro.qualTitlePlaceholder")} defaultValue={state.values?.title} error={fe.title} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("pro.qualIssuer")} name="issuer" error={fe.issuer} optional>
          <Input name="issuer" placeholder={t("pro.qualIssuerPlaceholder")} defaultValue={state.values?.issuer} error={fe.issuer} />
        </Field>
        <Field label={t("pro.qualReference")} name="referenceNo" hint={t("pro.qualReferenceHint")} error={fe.referenceNo} optional>
          <Input name="referenceNo" defaultValue={state.values?.referenceNo} error={fe.referenceNo} hint />
        </Field>
      </div>
      <SubmitButton variant="outline" pendingText={t("common.saving")}>
        {t("pro.qualAdd")}
      </SubmitButton>
    </form>
  );
}
