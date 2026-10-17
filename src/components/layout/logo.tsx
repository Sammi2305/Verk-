import Link from "next/link";
import { siteName } from "@/i18n";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#0e6f5d" />
      <path d="M8.5 10.5 16 22l7.5-11.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="9" r="2" fill="#d99a1c" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label={`${siteName} — forsíða`}>
      <LogoMark />
      <span className="text-[1.05rem] font-semibold tracking-tight text-ink">{siteName}</span>
    </Link>
  );
}
