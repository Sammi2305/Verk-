"use client";

import { useActionState, useState } from "react";
import type { PriceType } from "@prisma/client";
import { t } from "@/i18n";
import { initialActionState } from "@/lib/action";
import { declineInvitationAction, respondToInvitationAction } from "@/app/fagadili/actions";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const PRICE_TYPES: PriceType[] = ["FIXED", "ESTIMATE", "HOURLY", "INSPECTION"];

export function RespondForm({ invitationId, minDateTime }: { invitationId: string; minDateTime: string }) {
  const [state, action] = useActionState(respondToInvitationAction, initialActionState);
  const v = (state.values ?? {}) as Record<string, string>;
  const [priceType, setPriceType] = useState<PriceType>((v.priceType as PriceType) || "FIXED");
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <input type="hidden" name="invitationId" value={invitationId} />
      <fieldset>
        <legend className="text-sm font-medium">{t("invitation.priceType")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PRICE_TYPES.map((pt) => (
            <label
              key={pt}
              className={cn(
                "flex cursor-pointer flex-col rounded-xl border p-3 transition-colors",
                priceType === pt ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-line-strong hover:bg-subtle",
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" name="priceType" value={pt} checked={priceType === pt} onChange={() => setPriceType(pt)} className="accent-brand-600" />
                {t(`enums.priceType.${pt}`)}
              </span>
              <span className="mt-1 pl-6 text-xs text-muted">{t(`enums.priceTypeHint.${pt}`)}</span>
            </label>
          ))}
        </div>
        {fe.priceType && <p className="mt-1.5 text-sm font-medium text-danger-700">{fe.priceType}</p>}
      </fieldset>
      {priceType !== "INSPECTION" && (
        <Field label={t("invitation.amount")} name="priceAmountIsk" error={fe.priceAmountIsk}>
          <Input name="priceAmountIsk" inputMode="numeric" placeholder="45000" defaultValue={v.priceAmountIsk} error={fe.priceAmountIsk} />
        </Field>
      )}
      <Field label={t("invitation.priceNote")} name="priceNote" error={fe.priceNote} optional>
        <Input name="priceNote" maxLength={500} placeholder={t("invitation.priceNotePlaceholder")} defaultValue={v.priceNote} error={fe.priceNote} />
      </Field>
      <div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("invitation.proposedStart")} name="start" error={fe.start} optional>
            <Input name="start" type="datetime-local" step={900} min={minDateTime} defaultValue={v.start} error={fe.start} />
          </Field>
          <Field label={t("invitation.proposedEnd")} name="end" error={fe.end} optional>
            <Input name="end" type="datetime-local" step={900} min={minDateTime} defaultValue={v.end} error={fe.end} />
          </Field>
        </div>
        <p className="mt-1.5 text-sm text-muted">{t("invitation.proposedTimeHint")}</p>
      </div>
      <Field label={t("invitation.message")} name="message" error={fe.message} optional>
        <Textarea name="message" rows={3} maxLength={2000} placeholder={t("invitation.messagePlaceholder")} defaultValue={v.message} error={fe.message} />
      </Field>
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText={t("invitation.accepting")}>
        {t("invitation.accept")}
      </SubmitButton>
    </form>
  );
}

export function DeclineForm({ invitationId }: { invitationId: string }) {
  const [state, action] = useActionState(declineInvitationAction, initialActionState);
  return (
    <details className="group rounded-xl border border-line">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink-soft hover:text-ink">{t("invitation.decline")}</summary>
      <form action={action} className="space-y-4 border-t border-line p-4">
        <FormError message={state.error} />
        <input type="hidden" name="invitationId" value={invitationId} />
        <Field label={t("invitation.declineReason")} name="reason">
          <Textarea name="reason" rows={2} maxLength={500} />
        </Field>
        <SubmitButton variant="outline" pendingText={t("common.sending")}>
          {t("invitation.declineConfirm")}
        </SubmitButton>
      </form>
    </details>
  );
}
