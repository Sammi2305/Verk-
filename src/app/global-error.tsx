"use client";

// Last-resort error page, used when the root layout itself fails (e.g. the
// database is unreachable). It must render its own <html>/<body>.
import "./globals.css";
import { t } from "@/i18n";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="is">
      <body className="grid min-h-dvh place-items-center bg-canvas px-4 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-semibold">{t("errors.generic")}</h1>
          <p className="mt-2 text-muted">{t("errors.serverError")}</p>
          <button type="button" onClick={reset} className="mt-6 h-11 rounded-xl bg-brand-600 px-5 font-medium text-white hover:bg-brand-700">
            {t("errors.tryAgain")}
          </button>
        </div>
      </body>
    </html>
  );
}
