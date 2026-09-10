# HANDOFF

## What works (verified by tests and a manual run in local mode)

- Onboarding (4 screens), home dashboard (still needed / bought / packed / budget left, Buy next, quick actions, "Warwick already provides").
- Full checklist with statuses Need / Already have / Buy / Bought / Packed / Wait until arrival / Do not buy, filters, category grouping, search, per-item page, offline queue for status changes.
- Packing mode (`/checklist/pack`): items already have/bought grouped by a free-text "which box" label, large one-tap packed toggle, progress bar.
- Budget + purchases; remaining budget updates when items are marked bought (from basket, item page, or agent). Purchases can have a receipt photo attached from the Me page.
- Product search and compare with Cheapest / Best value / Nearby picks, hard compatibility filtering (induction hob, bed size, supplied appliances, prohibited items), source + checked-at on every card, manual refresh.
- Basket grouped by retailer with estimated total, confirmed vs potential savings, six optimisation modes (preview then apply).
- Map screen: device location (opt-in), Warwick campus, postcode; category and retailer filters; store cards with distance, open/closed, rating, "Open in Google Maps", retailer search; multi-stop Google Maps trip link for basket retailers; embedded map when a browser key is set.
- Offers: vouchers/promotions with source, expiry, terms; student-discount deep links that are never marked verified; expired offers filtered everywhere.
- Agent: 14 tools over the same services; streaming chat via the AI Gateway when configured; rule-based fallback for the six example requests without a key.
- PWA: manifest, icons, installable, offline shell, cached checklist, live-price endpoints never cached, offline banner.
- Supabase schema + RLS + profile trigger; local file store for development.
- Health endpoint (`/api/health`) with provider modes and per-provider success rate / latency.
- `pnpm check` (lint, typecheck, 72 unit/integration tests) and 8 Playwright E2E scenarios pass.

## What is mocked

| Provider | Mock | Live adapter | Needs |
|---|---|---|---|
| Product prices | `MockProductProvider` (~40 illustrative UK listings) | `SerpApiProductProvider` (Google Shopping, `gl=uk`, Coventry localisation) or `AwinFeedProductProvider` (Awin Create-a-Feed retailer product datafeeds — stock-accurate but limited to configured merchants) | `PRODUCT_PROVIDER=serpapi` + `SERPAPI_API_KEY`, or `PRODUCT_PROVIDER=awin-feed` + `AWIN_DATAFEED_API_KEY` + `AWIN_FEED_IDS` |
| Nearby stores / geocoding | `MockMapProvider` (14 approximate Coventry/Leamington stores, 4 postcodes) | `GoogleMapProvider` (Places API (New) Nearby + Text Search with field masks, Geocoding, Routes when enabled) | `MAP_PROVIDER=google`, `GOOGLE_MAPS_SERVER_API_KEY`, optional `GOOGLE_ROUTES_ENABLED=true`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for the in-app map |
| Vouchers | `MockOfferProvider` (2 verified, 1 expired, 2 unverified) | `AwinOfferProvider` (publisher promotions API, GB region) | `OFFER_PROVIDER=awin`, `AWIN_PUBLISHER_ID`, `AWIN_ACCESS_TOKEN` |
| Student discounts | public deep links only (Student Beans, UNiDAYS) | none – would require an approved partner API | `STUDENT_BEANS_PARTNER_KEY` / `UNIDAYS_PARTNER_KEY` are reserved, unused |
| AI agent | rule-based fallback | Vercel AI SDK via AI Gateway | `AI_GATEWAY_API_KEY`, `AI_MODEL` |
| Data + auth | `LocalStore` demo user, no sign-in | Supabase Postgres + magic link | `DATA_MODE=supabase` + Supabase vars |
| Receipt photos | base64 data URL stored inline on `purchases.receipt_image` | Supabase Storage bucket, storing the object path/URL instead | a receipts bucket + upload route (not built - see `Purchase.receiptImage` comment in `src/lib/types.ts`) |
| Alert emails | `ConsoleNotifier` (structured server log) | `ResendEmailNotifier` (Resend HTTP API) | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `ALERT_EMAIL_FROM` |

Mock results are badged "Mock data · not live" and are refused in production unless `ALLOW_MOCK_IN_PRODUCTION=true`.

## Things I could not verify (say so before trusting them)

1. **Warwick accommodation facts.** All 13 residences are seeded with their official URL and `verified_at: null`. No bed size, hob type or supplied appliances are populated, so bedding shows "Bed size not confirmed", cookware warns about hob type, and no appliance is suppressed until someone verifies each hall against the official page and updates `data/accommodations.json` (then re-imports). This is deliberate: the spec says never guess.
2. **The source checklist.** The CSV shipped here is authored, not Arielle's. Replace `data/warwick_move_in_checklist.csv` with the real export (same columns) and run `pnpm import:checklist`.
3. **Live adapters were tested only with mocked HTTP** (request shape, headers, field masks, mapping) plus optional live tests that run when keys are present. SerpApi field names, the Awin promotions request body, and Student Beans / UNiDAYS search URL formats should be checked against current docs on first live use.
4. **Vercel**: a Vercel project (`arielle-warwick-shopping`, root directory `arielle-warwick-shopping`) is linked to this repo. Pushes build previews in local demo mode (mock data, `/tmp` storage that resets on cold start). Real production needs `DATA_MODE=supabase` and the Supabase vars set in the Vercel dashboard.

## Deploying

See README → Production setup. Summary: create the Supabase project, run the migration, enable magic-link email, set env vars on Vercel with root directory `arielle-warwick-shopping`, deploy, seed with `DATA_MODE=supabase pnpm import:checklist`.

## Inviting Arielle

Send the Vercel URL. She types her email, taps the link in the email on her phone, and onboarding starts. Add to Home Screen for the app experience. To pre-load her Bought/Packed flags from the CSV: `DATA_MODE=supabase pnpm import:checklist --user <her auth uid>`.

## Known limitations

- Local mode is single-instance and file-backed: fine for development and a demo, not for Vercel (read-only filesystem) or multiple users.
- Product search and offers caches are shared across serverless instances via the `product_search_cache` / `offers_cache` Supabase tables when `DATA_MODE=supabase` (`src/lib/cache.ts`'s `SharedCache`, wired into `src/lib/providers/product/index.ts` and `src/lib/providers/offer/index.ts`); local mode still uses the in-memory `TtlCache`. The nearby-stores cache has no Supabase table and stays in-memory in both modes (per-instance only). Only verified against a mocked Supabase client in `tests/unit/cache.test.ts` - not yet exercised against a real Supabase project.
- The in-app Google map uses classic `google.maps.Marker`; switch to Advanced Markers with a Map ID if Google deprecates it in your project.
- Basket optimisation re-runs a compare per basket line, so with SerpApi it costs one shopping search per line (cached 30 min).
- The rule-based agent understands only the listed request patterns; anything else gets a hint of what it can do.
- No parent-sharing UI yet; the `shared_access` table and policies exist.
- The Playwright suite runs on Chromium with an iPhone viewport (WebKit is not installed in this environment).
- Price-drop / voucher-expiry alerts (`/api/alerts/run`) have no real cron runner or email provider wired up in this environment - see "Price-drop and voucher-expiry alerts" below for exactly what is real vs. what needs a key.

## Price-drop and voucher-expiry alerts

Recommendation #4 below is implemented, not vaporware, but it has never actually fired on a schedule because this dev environment has neither a cron runner nor an email provider account.

**What's real and tested:**
- Detection logic (`src/lib/alerts/detect.ts`, `src/lib/alerts/run.ts`): re-searches each basket line's exact listing (matched by provider id, or by same retailer + exact title as a fallback - never a guessed match), compares the fresh price against the last price recorded for it, and only calls it a "drop" when there *was* a prior recorded price and the saving clears `PRICE_DROP_ALERT_MIN` (default £0.50). The very first sighting of an item only seeds a baseline; it is never reported as a drop. Voucher-expiry reuses `src/lib/offers/expiry.ts` (`isNearingExpiry`, `daysUntilExpiry`) and only fires for currently-active offers ending within `VOUCHER_EXPIRY_ALERT_DAYS` (default 3), labelling unverified offers as "Potential offer" rather than confirmed. Unit tests: `tests/unit/alerts-detect.test.ts`, `tests/unit/alerts-run.test.ts`.
- The "last seen price" store: a new `PriceWatch` type + `price_watches` table (`supabase/migrations/0002_price_watches.sql`, owner-only RLS, isolation asserted in `supabase/tests/rls.sql`), plus `listPriceWatches` / `getPriceWatch` / `recordPriceObservation` on both `LocalStore` and `SupabaseStore`, and `listProfileUserIds` on `AdminStore` so the job can sweep every user. Tested in `tests/unit/local-store.test.ts`.
- The API route (`src/app/api/alerts/run/route.ts`): a real endpoint, `pnpm dev` + `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/alerts/run` runs a real sweep against local-mode data today. Integration test: `tests/integration/alerts-route.test.ts` (auth gating + a real price-drop/expiry detection through the actual route).
- The notifier (`src/lib/notify/`): `ConsoleNotifier` (structured server log, always works, used automatically today) and `ResendEmailNotifier` (plain HTTP call to Resend, no SDK dependency) behind `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `ALERT_EMAIL_FROM` - falls back to console exactly like every other mock-fallback provider in this codebase when the key is missing. Tested with mocked HTTP in `tests/integration/notify-provider.test.ts`.

**What needs a real key / runner to activate:**
1. **A cron runner.** `vercel.json` now has a `crons` entry (`0 8 * * *`, daily) pointing at `/api/alerts/run` - this is genuinely wired but has never fired, because Vercel Cron only runs once the project is deployed on Vercel, and this dev environment cannot deploy or simulate it. Once deployed, set `CRON_SECRET` in the Vercel project's env vars (Vercel signs cron requests with `Authorization: Bearer $CRON_SECRET` automatically once that var is set).
2. **`RESEND_API_KEY` + `ALERT_EMAIL_FROM`** (a domain verified with Resend) to actually email Arielle instead of just logging. Until then every alert still fires correctly and is visible in server logs - nothing is silently dropped.
3. **A resolvable user email.** `resolveUserEmail` (`src/lib/alerts/resolve-email.ts`) looks the user up via Supabase's admin auth API, so it only works once `DATA_MODE=supabase` and a real signed-up user exists; local demo mode has no real email and always falls back to the console notifier for that user (this is correct, not a bug - there's nothing to email).
4. **Repeat-alert de-duplication is a known gap.** A voucher that's still 2 days from expiring will be reported again on every single cron run until it expires (each report is individually accurate - it's not a fabricated repeat - but a daily cron means a daily repeat email). If this goes into real production, add a small "already notified" log (same shape as the price-watch table) before turning on real email delivery, so a user isn't emailed the same expiring voucher every day.

## Next recommended improvements

1. Verify the 13 halls against the official Warwick pages and populate `accommodations.json` (biggest quality win: unlocks bedding/cookware/appliance rules).
2. ~~Persist provider caches to the Supabase cache tables so all serverless instances share them.~~ Done: product search and offers caches now persist to `product_search_cache` / `offers_cache` in Supabase mode; only verified against a mocked client (no live Supabase project in this environment) - re-run `pnpm test:integration` against a real project's `rls.test.ts`-style setup, or exercise `/api/products/search` and `/api/offers` on two warm Vercel instances, to confirm cross-instance sharing end-to-end.
3. Add the parent role UI (share checklist/budget; contribution pot).
4. ~~Price-drop and voucher-expiry alerts~~ - done (see above); still needs `CRON_SECRET` + a live Vercel Cron deploy + `RESEND_API_KEY` to fully activate, and a de-dup log before real email delivery.
5. ~~Retailer feed adapters (Awin product feeds) to replace the shopping-search aggregator for stock-accurate data.~~ Done: `AwinFeedProductProvider` (`PRODUCT_PROVIDER=awin-feed`). Built and tested against mocked HTTP only — no real Awin datafeed account was available to verify the feed's actual column set or the download URL's exact query-parameter names against current Awin behaviour. Coverage is also inherently partial: it only searches the merchant feeds whose `AWIN_FEED_IDS` are configured, not every retailer the way the SerpApi aggregator does.
6. ~~Moving-day packing mode and receipt capture~~ **Done.** `/checklist/pack` groups items that are `have`/`bought`/`packed` by a free-text `box` label (a new field on `user_checklist`, reusing the existing status model - no parallel data structure) with a large one-tap "packed" toggle and a progress bar. Purchases on the Me page can now have a photo attached (`Purchase.receiptImage`); local/dev mode stores it as a downscaled base64 data URL directly on the record - swap in a real upload to Supabase Storage for production (see the comment on `receiptImage` in `src/lib/types.ts`).
