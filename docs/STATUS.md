# Status

_Last updated: 2026-10-15_

## Milestone 1 — first customer → tradesperson booking workflow: **done**

| Requirement | How it was verified |
| --- | --- |
| A tradesperson can register | E2E (desktop + mobile): registration, profile, categories, areas, qualification, submit for review, e-mail verification |
| An administrator can review their profile | E2E: admin verifies the qualification and approves; integration: cannot approve an unverified e-mail, rejection requires a note, audit log written |
| A customer can search for a tradesperson | E2E: homepage search → results card with "Staðfest réttindi" → profile; unapproved profiles are not listed |
| A customer can submit a job request | E2E: sign-up from the request flow, form with a photo, saved as a draft until e-mail verification, then sent |
| A tradesperson can accept the request | E2E: fixed price + proposed time; address hidden until booked |
| Both parties can view the booking | E2E: both see it, messaging works, an anonymous visitor is redirected to login, a customer gets 404 on `/stjornbord`; integration: a third party gets nothing |
| The booking can be completed | E2E: start → report completion → customer confirms; integration: not completed or billable until the customer confirms |
| The system records fee eligibility | E2E + integration: Basic → 990 kr. charge recorded (status "Skráð, ekki innheimt"); Pro, cancelled and dispute-cancelled → none; never charged twice |

Test results at the time of writing: `npm test` 38/38 passed (unit + integration on real Postgres); `npm run test:e2e` 2/2 passed (production build; desktop and Pixel 7 viewports, including no horizontal scrolling). `npm run typecheck` and `npm run lint` are clean.

## Also in place

Admin dashboard (overview counts, profile and qualification review, bookings, disputes, charge waivers with reasons, categories, areas, prices and VAT, users and suspension, audit log); disputes end to end; booking messages (text); in-app notifications with e-mail (test-captured); account settings and self-service account deletion; SEO (metadata, canonical URLs, sitemap with only real pages, robots, JSON-LD, `noindex` on empty category and area pages); draft privacy policy and terms.

## Not built yet (deliberately out of scope for milestone 1)

| Area | What is missing |
| --- | --- |
| Reviews & trust | Verified reviews after completed bookings, moderation, rating filter in search, reporting suspicious profiles. |
| Messaging | Photo attachments in messages; per-type notification preferences (there is one e-mail on/off switch). |
| E-mail | Real delivery. Everything is captured as test e-mail (see OPERATIONS.md). **Needs your approval and a provider choice.** |
| Billing | Pro subscriptions, invoices, payment collection, refunds through a provider, failed-payment handling. **Needs your approval** (see BILLING.md). |
| Tradesperson tools | Availability calendar and time-based availability search ("availability" today = accepting requests), quotes beyond the response price, customer management, registering independent customers, reminders, analytics, portfolio photos. |
| Lifecycle automation | Auto-expiry of unanswered requests; what happens if a customer never confirms completion (today the tradesperson can raise a dispute). |
| Admin | Support-request inbox; richer analytics (only real counts today). |
| Localisation | English dictionary (the structure supports it). |
| Privacy | Self-service data export (right of access); legal texts are drafts and need review by a lawyer. Nothing here is certified GDPR-compliant. |
| Quality | No automated accessibility audit (axe) or Lighthouse run yet; manual checks only (labels, focus, contrast tokens, keyboard menus). |

## Known limitations

- Search ranks in memory over up to 500 matching profiles. That's fine at launch scale; move scoring into SQL before it isn't.
- Rate limiting relies on a reverse proxy setting `X-Forwarded-For` (see OPERATIONS.md).
- Uploaded images live on local disk; switch to object storage before running more than one instance.
- Edits to an approved profile go live immediately, without re-review.
- Registration reveals whether an e-mail is already registered (rate-limited; a common trade-off for usability).

## Suggested next steps

1. Decide on an e-mail provider so verification and notifications can reach real people (needs approval).
2. Phase 3: reviews tied to completed bookings, moderation, reporting, message photos.
3. Request expiry and a completion-confirmation reminder (needs a small scheduled job).
4. Accessibility (axe) and performance (Lighthouse) passes in CI; a GitHub Actions workflow running lint, typecheck, unit, integration and e2e tests.
5. Phase 4: availability calendar and Pro plan, once a payment provider is chosen.
