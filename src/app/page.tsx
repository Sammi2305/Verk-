import Link from "next/link";
import { t } from "@/i18n";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  LockIcon,
  SearchIcon,
  ShieldCheckIcon,
  WalletIcon,
  WrenchIcon,
} from "@/components/ui/icons";

export default async function HomePage() {
  const [categories, areas] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.area.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const popular = categories.filter((c) => c.slug !== "annad").slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: t("site.name"),
    url: env().APP_URL,
    inLanguage: "is",
    potentialAction: { "@type": "SearchAction", target: `${env().APP_URL}/leit?q={q}`, "query-input": "required name=q" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-surface">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10rem] size-[36rem] rounded-full bg-brand-50 blur-3xl" />
        <Container className="relative grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="animate-fade-in">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              <MapDot /> {t("home.launchArea")}
            </p>
            <h1 className="text-[2.15rem] leading-[1.1] font-semibold tracking-tight text-balance text-ink sm:text-5xl">
              {t("home.headline")}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-muted">{t("home.subheadline")}</p>

            <form action="/leit" method="get" role="search" className="mt-8 rounded-2xl border border-line bg-surface p-3 shadow-(--shadow-raised) sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <label htmlFor="flokkur" className="block px-1 text-sm font-medium">
                    {t("home.searchCategoryLabel")}
                  </label>
                  <Select name="flokkur" defaultValue="">
                    <option value="">{t("home.searchCategoryPlaceholder")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.nameIs}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="svaedi" className="block px-1 text-sm font-medium">
                    {t("home.searchAreaLabel")}
                  </label>
                  <Select name="svaedi" defaultValue="">
                    <option value="">{t("home.anyArea")}</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.slug}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
                >
                  <SearchIcon className="size-4.5" />
                  {t("home.searchButton")}
                </button>
              </div>
            </form>
            <p className="mt-4 px-1 text-sm text-muted">
              {t("home.orRequest")}{" "}
              <Link href="/verkbeidni/ny" className="font-medium text-brand-700 hover:underline">
                {t("home.requestCta")} →
              </Link>
            </p>
          </div>

          <PriceTypesIllustration />
        </Container>
      </section>

      {/* Popular categories */}
      <section className="py-16 sm:py-20" aria-labelledby="popular-heading">
        <Container>
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 id="popular-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("home.popularTitle")}
            </h2>
            <Link href="/flokkar" className="hidden items-center gap-1 text-sm font-medium text-brand-700 hover:underline sm:inline-flex">
              {t("home.allCategories")} <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {popular.map((c) => (
              <li key={c.id} className="min-w-0">
                <Link
                  href={`/flokkar/${c.slug}`}
                  className="group flex h-full flex-col gap-3 rounded-(--radius-card) border border-line bg-surface p-4 shadow-(--shadow-card) transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-(--shadow-raised) sm:p-5"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <WrenchIcon />
                  </span>
                  <span className="font-medium break-words hyphens-auto text-ink">{c.nameIs}</span>
                  {c.descriptionIs && <span className="line-clamp-2 text-sm text-muted">{c.descriptionIs}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/flokkar" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-700 sm:hidden">
            {t("home.allCategories")} <ArrowRightIcon className="size-4" />
          </Link>
        </Container>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-surface py-16 sm:py-20" aria-labelledby="how-heading">
        <Container>
          <h2 id="how-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("home.howTitle")}
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { icon: <WrenchIcon />, title: t("home.how1Title"), text: t("home.how1Text") },
              { icon: <ChatIcon />, title: t("home.how2Title"), text: t("home.how2Text") },
              { icon: <CalendarIcon />, title: t("home.how3Title"), text: t("home.how3Text") },
            ].map((s, i) => (
              <li key={i} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-600 text-white">{s.icon}</span>
                  <span className="text-sm font-semibold text-brand-700">{i + 1}.</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Trust */}
      <section className="py-16 sm:py-20" aria-labelledby="trust-heading">
        <Container>
          <h2 id="trust-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("home.trustTitle")}
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <ShieldCheckIcon />, title: t("home.trust1Title"), text: t("home.trust1Text") },
              { icon: <BadgeCheckIcon />, title: t("home.trust2Title"), text: t("home.trust2Text") },
              { icon: <WalletIcon />, title: t("home.trust3Title"), text: t("home.trust3Text") },
              { icon: <LockIcon />, title: t("home.trust4Title"), text: t("home.trust4Text") },
            ].map((item) => (
              <li key={item.title} className="rounded-(--radius-card) border border-line bg-surface p-5 shadow-(--shadow-card)">
                <span className="text-brand-600">{item.icon}</span>
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* For tradespeople */}
      <section aria-labelledby="pros-heading">
        <Container>
          <div className="grid gap-10 overflow-hidden rounded-3xl bg-brand-900 px-6 py-12 text-white sm:px-12 sm:py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-medium tracking-wide text-brand-200 uppercase">{t("home.prosEyebrow")}</p>
              <h2 id="pros-heading" className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {t("home.prosTitle")}
              </h2>
              <p className="mt-4 max-w-lg text-lg text-brand-100">{t("home.prosText")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/nyskraning/fagadili" size="lg" variant="light">
                  {t("home.prosCta")}
                </ButtonLink>
                <ButtonLink href="/verdskra" size="lg" variant="onDark">
                  {t("home.prosPricing")} <ArrowRightIcon className="size-4" />
                </ButtonLink>
              </div>
            </div>
            <ul className="space-y-4">
              {[t("home.prosPoint1"), t("home.prosPoint2"), t("home.prosPoint3")].map((p) => (
                <li key={p} className="flex gap-3 rounded-2xl bg-white/6 p-4 ring-1 ring-white/10">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-500 text-brand-900">
                    <CheckIcon className="size-4" strokeWidth={2.5} />
                  </span>
                  <span className="text-[0.95rem] text-brand-50">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}

function MapDot() {
  return <span aria-hidden className="size-2 rounded-full bg-brand-500" />;
}

/** Explains the four price types customers will see. Purely explanatory — no fake data. */
function PriceTypesIllustration() {
  const types = ["FIXED", "ESTIMATE", "HOURLY", "INSPECTION"] as const;
  return (
    <div className="relative hidden lg:block" aria-hidden>
      <div className="rotate-1 rounded-3xl border border-line bg-canvas p-6 shadow-(--shadow-raised)">
        <p className="text-sm font-medium text-muted">{t("request.responses")}</p>
        <div className="mt-4 space-y-3">
          {types.map((type, i) => (
            <div key={type} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4" style={{ marginLeft: i % 2 ? "1.5rem" : 0 }}>
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <CheckIcon className="size-4" />
              </span>
              <div>
                <p className="font-medium text-ink">{t(`enums.priceType.${type}`)}</p>
                <p className="text-sm text-muted">{t(`enums.priceTypeHint.${type}`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
