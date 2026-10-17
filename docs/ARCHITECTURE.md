# Architecture

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Shape | One Next.js app (modular monolith) | Simplest thing that meets the requirements. No microservices. |
| Framework | Next.js 16 App Router, React 19, Server Actions | Server rendering for SEO and speed; Server Actions give typed mutations with built-in CSRF (Origin) protection. v16 rather than v15 because v15 pins a vulnerable PostCSS. |
| Database | PostgreSQL + Prisma 6 | Relational data with real integrity constraints (exclusion constraint against double booking, CHECKs, unique keys for idempotency). Prisma 6 is the latest **stable** line (the npm `latest` tag currently points to a v8 RC). |
| Auth | Own, small implementation | Database sessions with an http-only cookie, scrypt passwords (Node built-in, no native deps). Easier to audit than a framework for this scope, and server-side revocation is immediate. |
| Validation | zod, on the server | Every action re-validates; client checks are convenience only. |
| Styling | Tailwind 4 with design tokens | One token file (`globals.css`), small reusable components in `src/components/ui`. |
| Images | `sharp`, local disk driver | Uploads are re-encoded to WebP (strips EXIF/GPS, neutralises polyglots). The storage module is the only place to change for S3-compatible storage. |
| E-mail | "outbox" driver only | Nothing is delivered until a provider is chosen and approved (project rule 13). |
| i18n | Typed dictionary + `t()` | All UI text lives in `src/i18n/messages/is.ts`; message keys are type-checked. |

New runtime dependencies: `next`, `react`, `@prisma/client`, `zod`, `sharp`, `server-only`. Nothing else.

## Roles and permissions

| Role | Can |
| --- | --- |
| Visitor | Browse categories, search, view **approved** profiles, read pricing/legal pages. |
| `CUSTOMER` | Create job requests (sent only after e-mail verification), compare responses, book, message, confirm completion, raise disputes, cancel, delete account. |
| `TRADESPERSON` | Edit own profile, add qualifications (admin-verified), pause/resume requests, respond to or decline invitations, schedule/start/report completion, message, cancel, raise disputes after reporting completion, see own fees. |
| `ADMIN` | Review profiles and qualifications, resolve disputes, adjust charges (with reason), manage categories/areas, set prices/VAT/limits, suspend users, read the audit log. Cannot enable billing. |

Enforcement happens **on the server** in three layers:

1. **Route guards** (`src/lib/auth/guards.ts`): `requireUser`, `requireTradesperson`, `requireAdmin`. Wrong-role access to admin/pro areas returns 404 so the routes are not revealed.
2. **Service-level ownership checks** (`src/server/*`): every mutation re-loads the record and checks that the caller is the right party (e.g. only the booking's customer can confirm completion).
3. **Database constraints**: unique keys, CHECKs and an exclusion constraint guard invariants even if application code is bypassed.

`src/proxy.ts` only sets the Content-Security-Policy; it is deliberately **not** used for authorization.

## Core workflow

```
JobRequest:  DRAFT ──(e-mail verified)──▶ SUBMITTED ──(customer books)──▶ BOOKED
                 └─────────────(customer cancels)───────▶ CANCELLED

JobInvitation (one per invited tradesperson):
             PENDING ──▶ ACCEPTED (price type + amount + optional time) ──▶ SELECTED
                 │                                   └──────────────────▶ NOT_SELECTED
                 └──▶ DECLINED

Booking:     ACCEPTED ──schedule──▶ SCHEDULED ──start──▶ IN_PROGRESS
                │                      │                 │ (tradesperson reports completion)
                │                      │                 ├─ customer confirms ──▶ COMPLETED  ← fee decided here
                └──cancel──┬───────────┘                 └─ dispute ──▶ DISPUTED ──admin──▶ COMPLETED | CANCELLED
                           ▼
                       CANCELLED (never fee-bearing)
```

The brief's states map as: *Draft* = request DRAFT; *Submitted / Awaiting response* = request SUBMITTED with PENDING invitations; *Accepted, Scheduled, In progress, Completed, Cancelled, Disputed* = booking statuses.

Guarantees, all covered by tests:

- **Every transition is atomic and race-safe**: a conditional update on `(id, status, version)`. Double clicks, two tabs or both parties acting at once cannot apply a transition twice (`src/server/bookings.ts → transition`).
- **A request is booked at most once** (conditional `SUBMITTED → BOOKED` claim + unique `bookings.job_request_id`).
- **No double booking**: an app-level overlap check for friendly errors, and the Postgres exclusion constraint `booking_no_overlap` on `(profile_id, tstzrange(start, end))` for SCHEDULED/IN_PROGRESS bookings.
- **Completion needs both sides**: the tradesperson reports, the customer confirms (or an admin resolves a dispute).
- **Prices come from the server**: the booking copies price and time from the tradesperson's stored response, never from the client.
- **Privacy**: invited tradespeople see area, postcode and the customer's first name; street address, phone and e-mail are shared only with the booked tradesperson.

## Security measures

- scrypt password hashing (N=2¹⁵, r=8, p=1) with parameters stored per hash; timing-equalised login for unknown e-mails.
- Sessions: 256-bit random token in an `HttpOnly; SameSite=Lax; Secure` cookie (`__Host-` prefix in production); only the SHA-256 hash is stored; 30-day sliding expiry; all sessions revoked on password reset or suspension.
- Single-use, hashed, expiring tokens for e-mail verification (48 h) and password reset (1 h). Verification consumes the token on POST, not GET, so link scanners cannot use it.
- Rate limits (Postgres-backed, multi-instance safe) on login, registration, password reset, verification, job requests, responses, messages and account deletion.
- Nonce-based CSP with `strict-dynamic`, `frame-ancestors 'none'`, plus `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP and HSTS (production).
- Uploads: count and size limits, magic-byte check (JPEG/PNG/WebP only), re-encoding through sharp with a pixel limit, random storage keys, files stored outside `public/` and served only through an authorising route.
- Open-redirect protection on `?next=`; audit log for every admin action, written in the same transaction as the change.
- No secrets in client code; configuration via validated environment variables (`src/lib/env.ts`).

## Localisation

- `src/i18n/messages/is.ts` holds all short UI strings; `t("enums.bookingStatus.SCHEDULED")` is type-checked against it. Adding English means adding `messages/en.ts` with the same shape.
- Long-form content (privacy policy, terms) lives in `src/i18n/content/`.
- `src/lib/format.ts`: ISK (`5.990 kr.`), Icelandic dates (`24. desember 2026`), 24-hour time, timezone `Atlantic/Reykjavik` (the canonical IANA name; the brief's "Europe/Reykjavik" refers to the same zone, UTC+0 with no DST).
- `src/lib/validation.ts`: Icelandic phone numbers, postcodes and kennitala check digits.

## Design system

Tokens are in `src/app/globals.css` (`@theme`): warm neutrals, a deep fjord green-teal brand colour, sparing amber accents, AA-contrast pairs, one card radius and two shadows. Components in `src/components/ui/`: `Button`/`ButtonLink`, `SubmitButton` (disables while pending), `Field`/`Input`/`Textarea`/`Select`/`Checkbox` (labels, hints and errors wired with `aria-describedby`), `Card`, `Badge`, `Alert`, `EmptyState`, `PageHeader`, `DetailRow`, an icon set, and status badges. Mobile-first; keyboard focus is always visible; reduced motion is respected; menus use native `<details>` so they work without JavaScript.

## Search ranking

`src/server/tradespeople.ts → relevanceScore`: verified qualification in the category (+3), accepting requests (+2), text match on name/description. Ties rotate daily via a hash so equally relevant profiles share the top positions. **The subscription plan is never read** (a unit test guards this). Genuine review scores will be added here once reviews exist.
