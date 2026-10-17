import type { Metadata } from "next";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t("dashboard.title"), robots: { index: false } };

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
