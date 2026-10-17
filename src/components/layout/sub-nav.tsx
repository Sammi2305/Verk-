"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Horizontal, scrollable section navigation for dashboards (works on phones). */
export function SubNav({ items, label }: { items: { href: string; label: string; exact?: boolean; badge?: number }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 mb-8 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  active ? "border-brand-600 text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {item.label}
                {item.badge ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-accent-500 px-1.5 text-xs leading-5 font-semibold text-brand-900">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
