import Link from "next/link";
import { siteName, t } from "@/i18n";

// Brand mark: navy tile (#142D4E) with the orange (#F97316) "blocks" symbol —
// three joined squares and one lifted square. Mirrors src/app/icon.svg.
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#142D4E" />
      <g fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(7 7) scale(0.75)">
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label={t("a11y.home", { name: siteName })}>
      <LogoMark />
      <span className="text-[1.1rem] font-bold tracking-tight text-brand-600">{siteName}</span>
    </Link>
  );
}
