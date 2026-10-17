// Shared shape returned by server actions to forms (via useActionState).
export type ActionState = {
  ok?: boolean;
  message?: string; // translated, user-facing
  error?: string; // translated, user-facing form-level error
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | string[]>;
};

export const initialActionState: ActionState = {};

/** Error carrying a user-facing (already translated) message. */
export class UserError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "UserError";
  }
}
