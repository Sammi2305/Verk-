# Billing

**Real billing is OFF.** Fees are calculated and *recorded* so the business model can be verified, but nobody is invoiced or charged. `PlatformSettings.billingEnabled` is `false` and is intentionally not editable in the admin UI.

## Rules (implemented in `src/server/fees.ts`, unit-tested)

| Situation | Fee |
| --- | --- |
| Booking from the platform, completed and confirmed, tradesperson on **Grunnleið** | `Plan[BASIC].perJobFeeIsk` (seeded at 990 kr.) |
| Tradesperson on **Pro-leið** | none (`PRO_PLAN`) |
| Independently acquired customer (`source = INDEPENDENT`) | none, ever |
| Declined invitation, cancelled request or booking, dispute resolved as not completed | none — these never reach the fee function |
| Materials, percentage commission | not part of the model at all |

The decision happens once, inside the same transaction that moves the booking to `COMPLETED`, and is stored on the booking (`feeEligible`, `feeReason`). A `PlatformCharge` is created only when eligible. Its `booking_id` is unique, so a booking can never be charged twice. The charge snapshots the amount, VAT rate and whether the amount includes VAT; later price changes do not alter past charges.

Prices (`Plan`) and VAT settings are edited by admins at `/stjornbord/stillingar`; every change is audit-logged with before and after values. Admins can waive a charge, or reinstate a waived one, with a mandatory reason (`ChargeAdjustment` + audit log).

## Not built yet

- **Pro subscriptions.** Everyone is on Grunnleið; the UI says Pro opens once payments are connected. `Subscription` already exists.
- **Invoicing and payment collection**, failed-payment handling, refunds through a provider.
- **Registering independent customers** (the `INDEPENDENT` source exists and is fee-free, but there is no UI yet).

## Path to real billing (needs your approval first)

1. Choose a provider that supports ISK and Icelandic VAT invoicing (options to evaluate: Stripe, Rapyd/Valitor, Teya/SaltPay, or invoicing via an Icelandic accounting system with bank claims, *kröfur*). No card data would ever touch our servers.
2. Add a `PaymentProvider` interface (create customer, create invoice for charges, subscribe or cancel Pro, webhook handler) with an idempotency key per charge or period.
3. Webhooks update `PlatformCharge.status` (`INVOICED`, `PAID`) and subscriptions; never trust client-side amounts.
4. Only then add a guarded admin switch for `billingEnabled`, requiring the provider to be configured.
