# Operations

## Configuration (environment variables)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `APP_URL` | yes | Public base URL (links in e-mails, sitemap, canonical URLs) |
| `MAIL_DRIVER` | no | Only `outbox` exists today (captures e-mail, delivers nothing) |
| `MAIL_FROM` | no | Sender address for when a provider is added |
| `ENABLE_DEV_OUTBOX` | no | `true` shows captured e-mails at `/dev/postholf`. Ignored in production. |
| `UPLOAD_DIR` | no | Directory for uploaded images (outside `public/`, persistent, backed up) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | seed only | First administrator; remove from the environment after seeding |

Validated at startup in `src/lib/env.ts`. Secrets never reach client bundles (`server-only` imports).

## Deployment checklist

1. Node ≥ 20.18, PostgreSQL ≥ 14 (managed, with automated backups and point-in-time recovery).
2. `npm ci && npx prisma migrate deploy && npm run db:seed && npm run build && npm start`.
3. **Run behind a reverse proxy or load balancer that terminates TLS and *overwrites* `X-Forwarded-For`.** Rate limiting keys on the left-most `X-Forwarded-For` value. If the app is exposed directly, clients can spoof it, and if the header is missing all clients share one bucket.
4. Persistent volume for `UPLOAD_DIR` (or switch `src/lib/storage.ts` to S3-compatible object storage before running more than one instance).
5. Set `APP_URL` to the public `https://` origin. `ENABLE_DEV_OUTBOX` has no effect in production.
6. Log aggregation for stdout/stderr; alert on 5xx.

## E-mail

The `outbox` driver stores each message in `email_outbox` with `is_test = true` and status `TEST_CAPTURED`; subjects are prefixed `[PRÓFUN]`. **No real e-mail is sent.** To go live (requires approval):

1. Pick an EU-hosted transactional provider (e.g. Postmark, Mailgun EU, Amazon SES eu-west).
2. Add a driver in `src/lib/mail/index.ts` and an env var for its API key; set up SPF, DKIM and DMARC for the sending domain.
3. Send via a background job with retries (the outbox table already supports `QUEUED`/`SENT`/`FAILED`).

## Background jobs (not yet needed)

There are no scheduled jobs yet. Planned: appointment reminders, auto-expiry of unanswered requests, clean-up of expired sessions/tokens/rate-limit rows. A simple cron calling an authenticated internal endpoint is enough at launch scale.

## Data and privacy operations

- Account deletion is self-service (`/minar-sidur/stillingar`). It anonymises the user, request addresses and descriptions, and message bodies; deletes photos, sessions and notifications; keeps completed bookings and charges without personal identifiers.
- No production data should be deleted by hand without explicit approval; use the admin tools, which write to the audit log.
