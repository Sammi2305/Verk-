import type { Metadata, Viewport } from "next";
import "./globals.css";
import { appUrl } from "@/lib/runtime-config";
import { t } from "@/i18n";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";


export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: `${t("site.name")} — ${t("site.tagline")}`, template: `%s | ${t("site.name")}` },
  description: t("site.description"),
  openGraph: { type: "website", locale: "is_IS", siteName: t("site.name") },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#f7f7f4", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="is">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#efni"
          className="sr-only z-50 rounded-lg bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("nav.skipToContent")}
        </a>
        <Header />
        <main id="efni" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
