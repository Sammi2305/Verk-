import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Status filter pills for admin lists (plain links, works without JS). */
export function FilterPills({ base, param, current, options }: { base: string; param: string; current?: string; options: { value?: string; label: string }[] }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {options.map((o) => {
        const active = (o.value ?? "") === (current ?? "");
        return (
          <Link
            key={o.label}
            href={o.value ? `${base}?${param}=${o.value}` : base}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              active ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-soft hover:text-ink",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Table({ head, children, minWidth = "40rem" }: { head: ReactNode[]; children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-(--radius-card) border border-line bg-surface shadow-(--shadow-card)">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="border-b border-line bg-subtle/60 text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}
