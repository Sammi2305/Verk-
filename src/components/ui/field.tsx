import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-xl border bg-surface px-3.5 text-[0.95rem] text-ink placeholder:text-muted/80 transition-colors focus:border-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-100 disabled:bg-subtle";

function controlClass(invalid: boolean, extra?: string) {
  return cn(control, invalid ? "border-danger-600" : "border-line-strong", extra);
}

type FieldProps = { label: ReactNode; name: string; hint?: ReactNode; error?: string; optional?: boolean; children?: ReactNode };

/** Label + control + hint + error, wired up with aria-describedby for screen readers. */
export function Field({ label, name, hint, error, optional, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(valfrjálst)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${name}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-sm font-medium text-danger-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(name: string, hint?: unknown, error?: string) {
  return error ? `${name}-error` : hint ? `${name}-hint` : undefined;
}

export function Input({
  name,
  error,
  hint,
  className,
  ...props
}: ComponentProps<"input"> & { name: string; error?: string; hint?: unknown }) {
  return (
    <input
      id={name}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(name, hint, error)}
      className={controlClass(!!error, cn("h-11", className))}
      {...props}
    />
  );
}

export function Textarea({
  name,
  error,
  hint,
  className,
  ...props
}: ComponentProps<"textarea"> & { name: string; error?: string; hint?: unknown }) {
  return (
    <textarea
      id={name}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(name, hint, error)}
      className={controlClass(!!error, cn("min-h-28 py-2.5 leading-relaxed", className))}
      {...props}
    />
  );
}

export function Select({
  name,
  error,
  hint,
  className,
  children,
  ...props
}: ComponentProps<"select"> & { name: string; error?: string; hint?: unknown }) {
  return (
    <div className="relative">
      <select
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={controlClass(!!error, cn("h-11 appearance-none pr-10", className))}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export function Checkbox({ label, hint, className, ...props }: ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-line-strong accent-brand-600"
        {...props}
      />
      <span className="text-[0.95rem] leading-snug text-ink">
        {label}
        {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-danger-600/25 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
      {message}
    </div>
  );
}
