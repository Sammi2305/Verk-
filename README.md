# Verkvangur

An Icelandic marketplace where customers find, compare and book qualified
tradespeople — free for customers, fair for tradespeople. *Verkvangur* is a
working name, set in `src/i18n/messages/is.ts` (`site.name`).

> **Status:** Milestone 1 (the first end-to-end booking workflow) is built and
> tested. Real billing and real e-mail delivery are deliberately **off**. See
> [docs/STATUS.md](docs/STATUS.md) for exactly what works and what does not yet.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 ·
PostgreSQL 16 · Prisma 6 · zod · Vitest · Playwright. No paid services.
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the reasoning.

## Quick start

Requirements: Node.js ≥ 20.18, PostgreSQL ≥ 14 (with the `btree_gist` extension, bundled with Postgres).

```bash
npm install
cp .env.example .env            # then set DATABASE_URL and the seed admin password
npx prisma migrate deploy       # create tables + constraints
npm run db:seed                 # categories, areas, plans, settings, first admin
npm run db:seed:demo            # OPTIONAL, local only: clearly labelled demo accounts
npm run dev                     # http://localhost:3000
```

The demo seed refuses to run against anything but a local database. Demo
accounts (`pipari@demo.local`, `vidskiptavinur@demo.local`, …) use the password
`profun-1234`.

E-mails are **not sent** in development: they are captured in the database and
shown at `/dev/postholf` (enabled with `ENABLE_DEV_OUTBOX=true`, never available
in production). Use it to open verification and password-reset links.

## Deploying

Vercel works out of the box once a Postgres database is connected; migrations and the seed run on every deploy. Step-by-step: [docs/OPERATIONS.md → Deploying on Vercel](docs/OPERATIONS.md#deploying-on-vercel).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Unit + integration tests (needs `.env.test`) |
| `npm run test:e2e` | Playwright end-to-end tests, desktop + mobile (needs `.env.e2e`) |
| `npm run db:migrate` | Create a new migration in development |
| `npm run db:deploy` | Apply migrations (CI / production) |
| `npm run db:seed` | Idempotent reference-data seed + first admin |

## Testing

```bash
# one-time: create the two disposable test databases
createdb verkfinn_test && createdb verkfinn_e2e
cp .env.test.example .env.test && cp .env.e2e.example .env.e2e   # set the DB password
npx dotenv -e .env.test -- prisma migrate deploy

npm test            # 45 unit + integration tests against a real Postgres
npm run test:e2e    # builds for production, runs the full milestone flow on desktop and a Pixel 7 viewport
```

Integration tests **truncate** the database named in `.env.test`; the helper
refuses to run unless the database name contains `_test`.

## Project layout

```
prisma/              schema, migrations (incl. hand-written constraints), seeds
src/app/             routes (Icelandic URLs) and server actions
src/server/          domain services: auth, tradespeople, job-requests, bookings, fees, admin, account
src/lib/             db, auth (password/session/guards), validation, formatting, storage, mail, rate limit, audit
src/components/      design system (ui/), forms, layout, shared views
src/i18n/            centralised Icelandic messages + legal content
tests/               unit/, integration/, e2e/
docs/                architecture, database, billing, operations, status
```

## Documentation

- [docs/STATUS.md](docs/STATUS.md) — milestone checklist, verification, incomplete features, next steps
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, roles and permissions, booking state machine, security, i18n, design system
- [docs/DATABASE.md](docs/DATABASE.md) — schema overview and migration process
- [docs/BILLING.md](docs/BILLING.md) — fee rules and the path to real billing
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — configuration, deployment, e-mail, storage
