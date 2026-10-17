"use client";

import { useActionState, type ReactNode } from "react";
import { type ActionState, initialActionState } from "@/lib/action";
import { FormError } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Generic wrapper for small server-action forms with static children (e.g. a
 * single confirm button). Forms that need field errors use dedicated client
 * components, since functions cannot be passed from server components.
 */
export function ActionForm({
  action,
  children,
  hidden,
  className,
  successMessage,
}: {
  action: Action;
  children: ReactNode;
  hidden?: Record<string, string>;
  className?: string;
  successMessage?: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className={className ?? "space-y-4"} noValidate>
      <FormError message={state.error} />
      {state.ok && (state.message || successMessage) && <Alert tone="success">{state.message ?? successMessage}</Alert>}
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
    </form>
  );
}
