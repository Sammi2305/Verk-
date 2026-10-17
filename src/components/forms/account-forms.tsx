"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { initialActionState } from "@/lib/action";
import { deleteAccountAction, updateAccountAction } from "@/app/minar-sidur/actions";
import { Checkbox, Field, FormError, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/primitives";

export function AccountForm({ name, phone, email, emailNotifications }: { name: string; phone: string; email: string; emailNotifications: boolean }) {
  const [state, action] = useActionState(updateAccountAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  const v = state.ok ? undefined : (state.values as Record<string, string> | undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <FormError message={state.error} />
      <Field label={t("auth.email")} name="email-readonly">
        <Input name="email-readonly" value={email} readOnly disabled />
      </Field>
      <Field label={t("auth.name")} name="name" error={fe.name}>
        <Input name="name" autoComplete="name" defaultValue={v?.name ?? name} error={fe.name} />
      </Field>
      <Field label={t("auth.phone")} name="phone" hint={t("auth.phoneHint")} error={fe.phone} optional>
        <Input name="phone" type="tel" inputMode="tel" defaultValue={v?.phone ?? phone} error={fe.phone} hint />
      </Field>
      <div className="border-t border-line pt-5">
        <p className="mb-3 text-sm font-medium">{t("dashboard.notificationsSection")}</p>
        <Checkbox
          name="emailNotifications"
          defaultChecked={v ? v.emailNotifications === "on" : emailNotifications}
          label={t("dashboard.emailNotifications")}
          hint={t("dashboard.emailNotificationsHint")}
        />
      </div>
      <SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, initialActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.error} />
      <Field label={t("dashboard.deleteConfirmPassword")} name="password" error={state.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="current-password" error={state.fieldErrors?.password} />
      </Field>
      <SubmitButton variant="danger" pendingText={t("common.sending")}>
        {t("dashboard.deleteButton")}
      </SubmitButton>
    </form>
  );
}
