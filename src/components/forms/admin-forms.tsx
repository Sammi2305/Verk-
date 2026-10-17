"use client";

import { useActionState } from "react";
import type { Category } from "@prisma/client";
import { t } from "@/i18n";
import { type ActionState, initialActionState } from "@/lib/action";
import { saveCategoryAction, updatePricingAction } from "@/app/stjornbord/actions";
import { Checkbox, Field, FormError, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/primitives";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;
type Variant = "primary" | "outline" | "danger" | "secondary";

/** Note + one or more decision buttons (each submits a different `name` value). */
export function DecisionForm({
  action: serverAction,
  hidden,
  noteLabel,
  notePlaceholder,
  buttons,
  buttonName = "decision",
}: {
  action: Action;
  hidden: Record<string, string>;
  noteLabel: string;
  notePlaceholder?: string;
  buttons: { value: string; label: string; variant?: Variant }[];
  buttonName?: string;
}) {
  const [state, action, pending] = useActionState(serverAction, initialActionState);
  const fieldId = `note-${Object.values(hidden).join("-")}`;
  return (
    <form action={action} className="space-y-3" noValidate>
      <FormError message={state.error} />
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="block text-sm font-medium">
          {noteLabel}
        </label>
        <Textarea name="note" id={fieldId} rows={2} maxLength={1000} placeholder={notePlaceholder} />
      </div>
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <Button key={b.value} type="submit" name={buttonName} value={b.value} variant={b.variant ?? "outline"} size="sm" disabled={pending}>
            {b.label}
          </Button>
        ))}
      </div>
    </form>
  );
}

export function CategoryForm({ category, nextSort }: { category?: Category; nextSort?: number }) {
  const [state, action] = useActionState(saveCategoryAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  const v = state.ok ? undefined : (state.values as Record<string, string> | undefined);
  const k = category?.id ?? "new";
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.error} />
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("admin.categoryName")} name={`nameIs-${k}`} error={fe.nameIs}>
          <Input name="nameIs" id={`nameIs-${k}`} defaultValue={v?.nameIs ?? category?.nameIs} error={fe.nameIs} />
        </Field>
        <Field label={t("admin.categorySlug")} name={`slug-${k}`} error={fe.slug}>
          <Input name="slug" id={`slug-${k}`} defaultValue={v?.slug ?? category?.slug} error={fe.slug} />
        </Field>
        <Field label={t("admin.categoryNameEn")} name={`nameEn-${k}`} optional>
          <Input name="nameEn" id={`nameEn-${k}`} defaultValue={v?.nameEn ?? category?.nameEn ?? ""} />
        </Field>
        <Field label={t("admin.categorySort")} name={`sortOrder-${k}`} error={fe.sortOrder}>
          <Input name="sortOrder" id={`sortOrder-${k}`} type="number" min={0} defaultValue={v?.sortOrder ?? category?.sortOrder ?? nextSort ?? 0} error={fe.sortOrder} />
        </Field>
      </div>
      <Field label={t("admin.categoryDescription")} name={`descriptionIs-${k}`} error={fe.descriptionIs} optional>
        <Input name="descriptionIs" id={`descriptionIs-${k}`} defaultValue={v?.descriptionIs ?? category?.descriptionIs ?? ""} error={fe.descriptionIs} />
      </Field>
      <div className="flex flex-wrap gap-5">
        <Checkbox name="active" defaultChecked={v ? v.active === "on" : (category?.active ?? true)} label={t("admin.categoryActive")} />
        <Checkbox name="licenseRelevant" defaultChecked={v ? v.licenseRelevant === "on" : (category?.licenseRelevant ?? false)} label={t("admin.categoryLicense")} />
      </div>
      <SubmitButton size="sm" pendingText={t("common.saving")}>
        {t("common.save")}
      </SubmitButton>
    </form>
  );
}

export function PricingForm({
  values,
}: {
  values: { basicPerJobFeeIsk: number; proMonthlyPriceIsk: number; vatRatePercent: number; pricesIncludeVat: boolean; maxInvitesPerRequest: number };
}) {
  const [state, action] = useActionState(updatePricingAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  const v = state.ok ? undefined : (state.values as Record<string, string> | undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={`${t("enums.planCode.BASIC")} — ${t("admin.planPerJob")}`} name="basicPerJobFeeIsk" error={fe.basicPerJobFeeIsk}>
          <Input name="basicPerJobFeeIsk" type="number" min={0} defaultValue={v?.basicPerJobFeeIsk ?? values.basicPerJobFeeIsk} error={fe.basicPerJobFeeIsk} />
        </Field>
        <Field label={`${t("enums.planCode.PRO")} — ${t("admin.planMonthly")}`} name="proMonthlyPriceIsk" error={fe.proMonthlyPriceIsk}>
          <Input name="proMonthlyPriceIsk" type="number" min={0} defaultValue={v?.proMonthlyPriceIsk ?? values.proMonthlyPriceIsk} error={fe.proMonthlyPriceIsk} />
        </Field>
        <Field label={t("admin.vatRate")} name="vatRatePercent" error={fe.vatRatePercent}>
          <Input name="vatRatePercent" type="number" min={0} max={100} defaultValue={v?.vatRatePercent ?? values.vatRatePercent} error={fe.vatRatePercent} />
        </Field>
        <Field label={t("admin.maxInvites")} name="maxInvitesPerRequest" error={fe.maxInvitesPerRequest}>
          <Input name="maxInvitesPerRequest" type="number" min={1} max={10} defaultValue={v?.maxInvitesPerRequest ?? values.maxInvitesPerRequest} error={fe.maxInvitesPerRequest} />
        </Field>
      </div>
      <Checkbox name="pricesIncludeVat" defaultChecked={v ? v.pricesIncludeVat === "on" : values.pricesIncludeVat} label={t("admin.pricesIncludeVat")} />
      <SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>
    </form>
  );
}

