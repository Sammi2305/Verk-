@AGENTS.md

# Verkvangur — working rules

Icelandic tradesperson marketplace. Read `docs/STATUS.md` (what exists) and `docs/ARCHITECTURE.md` before changing anything structural.

## Non-negotiables
- No fake professionals, reviews, counts or statistics in anything that can reach production. Demo data only via `prisma/seed-demo.ts` (local DB only, labelled "(prófun)").
- Never hardcode prices: they come from `Plan` / `PlatformSettings`. Never let the subscription plan influence search ranking (`relevanceScore`).
- Fees are decided only in `src/server/fees.ts`, inside the transaction that completes a booking. No percentage commissions, no fees on materials, cancellations, declines or independent customers.
- Real billing and real e-mail delivery stay off until the owner explicitly approves (and a provider is configured). Ask before adding paid services.
- Never show a verification badge unless a `Qualification` is `VERIFIED`. Never expose a customer's street address, phone or e-mail to anyone but the booked tradesperson (and admins).
- Never run `prisma migrate reset` or delete data in a non-disposable database without explicit approval.

## Conventions
- All user-facing text goes through `t()` with keys in `src/i18n/messages/is.ts` (natural Icelandic). No inline UI strings.
- Business logic lives in `src/server/*` (testable without Next); server actions in `src/app/**/actions.ts` only authenticate, validate (zod) and call services.
- Every mutation re-checks authorization server-side; booking transitions go through `transition()` (status + version guarded).
- Admin mutations write `audit()` in the same transaction.
- Format money/dates with `src/lib/format.ts` (ISK, `Atlantic/Reykjavik`, 24 h).
- Before claiming something works: `npm run typecheck && npm run lint && npm test` and, for flows, `npm run test:e2e`. Update `docs/STATUS.md` when scope changes.
