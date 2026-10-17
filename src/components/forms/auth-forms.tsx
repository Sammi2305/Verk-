"use client";

import Link from "next/link";
import { useActionState } from "react";
import { t } from "@/i18n";
import { initialActionState } from "@/lib/action";
import {
  forgotPasswordAction,
  loginAction,
  registerCustomerAction,
  registerTradespersonAction,
  resendVerificationAction,
  resetPasswordAction,
  verifyEmailAction,
} from "@/app/(auth)/actions";
import { Checkbox, Field, FormError, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initialActionState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t("auth.email")} name="email">
        <Input name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      </Field>
      <Field label={t("auth.password")} name="password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        <Link href="/gleymt-lykilord" className="text-sm font-medium text-brand-700 hover:underline">
          {t("auth.forgot")}
        </Link>
      </div>
      <SubmitButton className="w-full" pendingText={t("auth.loggingIn")}>
        {t("auth.loginButton")}
      </SubmitButton>
    </form>
  );
}

function TermsCheckbox({ error, defaultChecked }: { error?: string; defaultChecked?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Checkbox
        name="terms"
        required
        defaultChecked={defaultChecked}
        label={
          <>
            {t("auth.acceptTermsPrefix")}{" "}
            <Link href="/skilmalar" target="_blank" className="font-medium text-brand-700 underline">
              {t("auth.termsLink")}
            </Link>{" "}
            {t("auth.and")}{" "}
            <Link href="/personuvernd" target="_blank" className="font-medium text-brand-700 underline">
              {t("auth.privacyLink")}
            </Link>
            .
          </>
        }
      />
      {error && (
        <p className="text-sm font-medium text-danger-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function RegisterCustomerForm({ next }: { next?: string }) {
  const [state, action] = useActionState(registerCustomerAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t("auth.name")} name="name" error={fe.name}>
        <Input name="name" autoComplete="name" required defaultValue={v.name} error={fe.name} />
      </Field>
      <Field label={t("auth.email")} name="email" error={fe.email}>
        <Input name="email" type="email" autoComplete="email" required defaultValue={v.email} error={fe.email} />
      </Field>
      <Field label={t("auth.phone")} name="phone" hint={t("auth.phoneHint")} error={fe.phone} optional>
        <Input name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="612 3456" defaultValue={v.phone} error={fe.phone} hint />
      </Field>
      <Field label={t("auth.password")} name="password" hint={t("auth.passwordHint")} error={fe.password}>
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} error={fe.password} hint />
      </Field>
      <TermsCheckbox error={fe.terms} defaultChecked={v.terms === "on"} />
      <SubmitButton className="w-full" pendingText={t("auth.registering")}>
        {t("auth.registerButton")}
      </SubmitButton>
    </form>
  );
}

export function RegisterTradespersonForm() {
  const [state, action] = useActionState(registerTradespersonAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <Field label={t("auth.businessName")} name="businessName" hint={t("auth.businessNameHint")} error={fe.businessName}>
        <Input name="businessName" autoComplete="organization" required defaultValue={v.businessName} error={fe.businessName} hint />
      </Field>
      <Field label={t("auth.companyId")} name="companyId" hint={t("auth.companyIdHint")} error={fe.companyId} optional>
        <Input name="companyId" inputMode="numeric" placeholder="000000-0000" defaultValue={v.companyId} error={fe.companyId} hint />
      </Field>
      <Field label={t("auth.yourName")} name="name" error={fe.name}>
        <Input name="name" autoComplete="name" required defaultValue={v.name} error={fe.name} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("auth.email")} name="email" error={fe.email}>
          <Input name="email" type="email" autoComplete="email" required defaultValue={v.email} error={fe.email} />
        </Field>
        <Field label={t("auth.phone")} name="phone" error={fe.phone} optional>
          <Input name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="612 3456" defaultValue={v.phone} error={fe.phone} />
        </Field>
      </div>
      <Field label={t("auth.password")} name="password" hint={t("auth.passwordHint")} error={fe.password}>
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} error={fe.password} hint />
      </Field>
      <TermsCheckbox error={fe.terms} defaultChecked={v.terms === "on"} />
      <SubmitButton className="w-full" pendingText={t("auth.registering")}>
        {t("auth.proRegisterButton")}
      </SubmitButton>
    </form>
  );
}

export function ResendVerificationForm({ compact }: { compact?: boolean }) {
  const [state, action] = useActionState(resendVerificationAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      {state.message && <p className="text-sm font-medium text-success-700" role="status">{state.message}</p>}
      {state.error && <p className="text-sm font-medium text-danger-700" role="alert">{state.error}</p>}
      <SubmitButton variant={compact ? "outline" : "secondary"} size={compact ? "sm" : "md"} pendingText={t("common.sending")}>
        {t("auth.resend")}
      </SubmitButton>
    </form>
  );
}

export function VerifyEmailForm({ token, continueHref }: { token: string; continueHref: string }) {
  const [state, action] = useActionState(verifyEmailAction, initialActionState);
  if (state.ok) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title={t("auth.verifySuccessTitle")}>{state.message}</Alert>
        <Link href={continueHref} className={buttonClass("primary", "md", "w-full")}>
          {t("common.next")}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5">
      <FormError message={state.error} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton className="w-full" pendingText={t("common.sending")}>
        {t("common.confirm")}
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initialActionState);
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <Field label={t("auth.email")} name="email" error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      </Field>
      <SubmitButton className="w-full" pendingText={t("common.sending")}>
        {t("auth.forgotButton")}
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialActionState);
  if (state.ok) {
    return (
      <div className="space-y-5">
        <Alert tone="success">{state.message}</Alert>
        <Link href="/innskraning" className={buttonClass("primary", "md", "w-full")}>
          {t("auth.goToLogin")}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <input type="hidden" name="token" value={token} />
      <Field label={t("auth.newPassword")} name="password" hint={t("auth.passwordHint")} error={state.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} error={state.fieldErrors?.password} hint />
      </Field>
      <SubmitButton className="w-full" pendingText={t("common.saving")}>
        {t("auth.resetButton")}
      </SubmitButton>
    </form>
  );
}
