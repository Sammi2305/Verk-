import Link from "next/link";
import type { ReactNode } from "react";

/** A simple, tappable list of rows used across dashboards. */
export function RowList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line overflow-hidden rounded-(--radius-card) border border-line bg-surface shadow-(--shadow-card)">{children}</ul>;
}

export function RowLink({ href, title, meta, aside, highlight }: { href: string; title: ReactNode; meta?: ReactNode; aside?: ReactNode; highlight?: boolean }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-subtle sm:px-5">
        {highlight && <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent-500" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{title}</p>
          {meta && <p className="mt-0.5 truncate text-sm text-muted">{meta}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </Link>
    </li>
  );
}
