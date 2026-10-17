import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AlertIcon, CheckIcon, InfoIcon } from "./icons";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-(--radius-card) border border-line bg-surface shadow-(--shadow-card)", className)} {...props} />;
}

export function CardSection({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent";
const badgeTones: Record<Tone, string> = {
  neutral: "bg-subtle text-ink-soft ring-line",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-success-50 text-success-700 ring-success-700/20",
  warning: "bg-warning-50 text-warning-700 ring-warning-700/20",
  danger: "bg-danger-50 text-danger-700 ring-danger-700/20",
  info: "bg-info-50 text-info-700 ring-info-700/20",
  accent: "bg-accent-100 text-accent-700 ring-accent-500/30",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", badgeTones[tone], className)}
      {...props}
    />
  );
}

const alertTones = {
  info: { box: "bg-info-50 border-info-700/15 text-info-700", Icon: InfoIcon },
  success: { box: "bg-success-50 border-success-700/15 text-success-700", Icon: CheckIcon },
  warning: { box: "bg-warning-50 border-warning-700/20 text-warning-700", Icon: AlertIcon },
  danger: { box: "bg-danger-50 border-danger-700/20 text-danger-700", Icon: AlertIcon },
  neutral: { box: "bg-subtle border-line text-ink-soft", Icon: InfoIcon },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: keyof typeof alertTones;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const { box, Icon } = alertTones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed [&_a]:font-medium [&_a]:underline">{children}</div>}
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-(--radius-card) border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1.5 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[0.95rem] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, className, as: As = "h2" }: { children: ReactNode; className?: string; as?: "h2" | "h3" }) {
  return <As className={cn("text-lg font-semibold tracking-tight text-ink", className)}>{children}</As>;
}

/** Definition list row for detail pages. */
export function DetailRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-[0.95rem] text-ink">{children}</dd>
    </div>
  );
}
