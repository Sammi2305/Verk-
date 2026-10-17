"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { type ActionState, initialActionState } from "@/lib/action";
import { cancelBookingAction, disputeAction, scheduleAction, sendMessageAction } from "@/app/bokanir/actions";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/primitives";

export function ScheduleForm({ bookingId, start, end, min, rescheduling }: { bookingId: string; start: string; end: string; min: string; rescheduling: boolean }) {
  const [state, action] = useActionState(scheduleAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  const v = state.ok ? undefined : (state.values as Record<string, string> | undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.error} />
      {state.ok && <Alert tone="success">{t("common.saved")}</Alert>}
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("booking.start")} name="start" error={fe.start}>
          <Input name="start" type="datetime-local" step={900} min={min} defaultValue={v?.start ?? start} error={fe.start} />
        </Field>
        <Field label={t("booking.end")} name="end" error={fe.end}>
          <Input name="end" type="datetime-local" step={900} min={min} defaultValue={v?.end ?? end} error={fe.end} />
        </Field>
      </div>
      <SubmitButton variant={rescheduling ? "outline" : "primary"} pendingText={t("common.saving")}>
        {t("booking.scheduleButton")}
      </SubmitButton>
    </form>
  );
}

type ReasonAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function ReasonForm({ bookingId, action: serverAction, intro, label, button, danger }: { bookingId: string; action: ReasonAction; intro: string; label: string; button: string; danger?: boolean }) {
  const [state, action] = useActionState(serverAction, initialActionState);
  return (
    <form action={action} className="space-y-3 border-t border-line p-4" noValidate>
      <FormError message={state.error} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="text-sm text-muted">{intro}</p>
      <Field label={label} name="reason" error={state.fieldErrors?.reason}>
        <Textarea name="reason" rows={3} maxLength={1000} error={state.fieldErrors?.reason} />
      </Field>
      <SubmitButton variant={danger ? "danger" : "outline"} pendingText={t("common.sending")}>
        {button}
      </SubmitButton>
    </form>
  );
}

export function DisputeForm({ bookingId }: { bookingId: string }) {
  return (
    <ReasonForm
      bookingId={bookingId}
      action={disputeAction}
      intro={t("booking.disputeIntro")}
      label={t("booking.disputeReason")}
      button={t("booking.disputeButton")}
    />
  );
}

export function CancelBookingForm({ bookingId }: { bookingId: string }) {
  return (
    <ReasonForm
      bookingId={bookingId}
      action={cancelBookingAction}
      intro={t("booking.cancelHint")}
      label={t("booking.cancelReason")}
      button={t("booking.cancelButton")}
      danger
    />
  );
}

export function MessageForm({ bookingId }: { bookingId: string }) {
  const [state, action] = useActionState(sendMessageAction, initialActionState);
  return (
    <form action={action} className="mt-5 space-y-3" noValidate>
      <FormError message={state.error} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <label htmlFor="body" className="sr-only">
        {t("booking.messagePlaceholder")}
      </label>
      <Textarea name="body" rows={2} maxLength={4000} placeholder={t("booking.messagePlaceholder")} error={state.fieldErrors?.body} />
      {state.fieldErrors?.body && <p className="text-sm text-danger-700">{state.fieldErrors.body}</p>}
      <SubmitButton size="sm" pendingText={t("common.sending")}>
        {t("booking.sendMessage")}
      </SubmitButton>
    </form>
  );
}
