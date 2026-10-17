# Database

PostgreSQL, managed with Prisma. The schema (`prisma/schema.prisma`) is the source of truth and is commented model by model. Money is integer ISK, all timestamps are `timestamptz` (UTC).

## Models

| Area | Models | Notes |
| --- | --- | --- |
| Identity | `User`, `Session`, `EmailToken`, `RateLimit` | One `role` per user. Session and e-mail tokens are stored only as SHA-256 hashes. |
| Reference | `Category`, `Area` | Admin-editable. Areas outside höfuðborgarsvæðið are seeded *inactive* so national expansion is a setting, not a migration. |
| Tradespeople | `TradespersonProfile`, `TradespersonCategory`, `TradespersonArea`, `Qualification` | Profile `status` drives visibility (only `APPROVED` + active user is public). Qualifications carry their own verification state; badges are shown only for `VERIFIED`. |
| Marketplace | `JobRequest`, `JobInvitation`, `Booking`, `BookingEvent`, `Message`, `Dispute`, `Upload` | A request is sent to 1–N invitations; the customer confirms one, which creates the booking. `BookingEvent` is the immutable timeline. |
| Money | `Plan`, `Subscription`, `PlatformSettings`, `PlatformCharge`, `ChargeAdjustment` | Prices are rows, not constants. A charge snapshots amount, VAT rate and VAT-inclusion at completion time. |
| Ops | `Notification`, `EmailOutbox`, `AuditLog` | |

## Constraints beyond Prisma

Hand-written in the initial migration (`prisma/migrations/*_init/migration.sql`):

- `booking_no_overlap` — `EXCLUDE USING gist (profile_id WITH =, tstzrange(scheduled_start, scheduled_end) WITH &&) WHERE status IN ('SCHEDULED','IN_PROGRESS')`. Requires `btree_gist`.
- `booking_time_order`, `booking_scheduled_has_time` — sane scheduling data.
- Non-negative prices on bookings, invitations, plans and charges.
- `settings_singleton` (only row id 1) and a VAT range check.

Idempotency keys: `platform_charges.booking_id` (unique — one charge per booking ever), `bookings.job_request_id` and `bookings.invitation_id` (unique), `job_invitations (job_request_id, profile_id)` (unique).

## Migration process

- **Development:** edit `schema.prisma`, run `npm run db:migrate -- --name <change>`. For anything Prisma cannot express, use `--create-only`, append SQL, then apply.
- **CI / production:** `npm run db:deploy` (`prisma migrate deploy`) — applies pending migrations only, never resets.
- `prisma migrate reset` wipes a database. Never run it outside a disposable local database. The test suites do not use it.
- Seeding (`npm run db:seed`) is idempotent and never overwrites values an admin has changed.
