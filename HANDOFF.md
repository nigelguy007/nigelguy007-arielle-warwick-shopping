# HANDOFF

## What works (verified by tests and a manual run in local mode)

- Onboarding (4 screens), home dashboard (still needed / bought / packed / budget left, Buy next, quick actions, "Warwick already provides").
- Full checklist with statuses Need / Already have / Buy / Bought / Packed / Wait until arrival / Do not buy, filters, category grouping, search, per-item page, offline queue for status changes.
- Budget + purchases; remaining budget updates when items are marked bought (from basket, item page, or agent).
- Product search and compare with Cheapest / Best value / Nearby picks, hard compatibility filtering (induction hob, bed size, supplied appliances, prohibited items), source + checked-at on every card, manual refresh.
- Basket grouped by retailer with estimated total, confirmed vs potential savings, six optimisation modes (preview then apply).
- Map screen: device location (opt-in), Warwick campus, postcode; category and retailer filters; store cards with distance, open/closed, rating, "Open in Google Maps", retailer search; multi-stop Google Maps trip link for basket retailers; embedded map when a browser key is set.
- Offers: vouchers/promotions with source, expiry, terms; student-discount deep links that are never marked verified; expired offers filtered everywhere.
- Agent: 14 tools over the same services; streaming chat via the AI Gateway when configured; rule-based fallback for the six example requests without a key.
- PWA: manifest, icons, installable, offline shell, cached checklist, live-price endpoints never cached, offline banner.
- Supabase schema + RLS + profile trigger; local file store for development.
- Health endpoint (`/api/health`) with provider modes and per-provider success rate / latency.
- `pnpm check` (lint, typecheck, 66 unit/integration tests) and 8 Playwright E2E scenarios pass.

## What is mocked

| Provider | Mock | Live adapter | Needs |
|---|---|---|---|
| Product prices | `MockProductProvider` (~40 illustrative UK listings) | `SerpApiProductProvider` (Google Shopping, `gl=uk`, Coventry localisation) or `AwinFeedProductProvider` (Awin Create-a-Feed retailer product datafeeds — stock-accurate but limited to configured merchants) | `PRODUCT_PROVIDER=serpapi` + `SERPAPI_API_KEY`, or `PRODUCT_PROVIDER=awin-feed` + `AWIN_DATAFEED_API_KEY` + `AWIN_FEED_IDS` |
| Nearby stores / geocoding | `MockMapProvider` (14 approximate Coventry/Leamington stores, 4 postcodes) | `GoogleMapProvider` (Places API (New) Nearby + Text Search with field masks, Geocoding, Routes when enabled) | `MAP_PROVIDER=google`, `GOOGLE_MAPS_SERVER_API_KEY`, optional `GOOGLE_ROUTES_ENABLED=true`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for the in-app map |
| Vouchers | `MockOfferProvider` (2 verified, 1 expired, 2 unverified) | `AwinOfferProvider` (publisher promotions API, GB region) | `OFFER_PROVIDER=awin`, `AWIN_PUBLISHER_ID`, `AWIN_ACCESS_TOKEN` |
| Student discounts | public deep links only (Student Beans, UNiDAYS) | none – would require an approved partner API | `STUDENT_BEANS_PARTNER_KEY` / `UNIDAYS_PARTNER_KEY` are reserved, unused |
| AI agent | rule-based fallback | Vercel AI SDK via AI Gateway | `AI_GATEWAY_API_KEY`, `AI_MODEL` |
| Data + auth | `LocalStore` demo user, no sign-in | Supabase Postgres + magic link | `DATA_MODE=supabase` + Supabase vars |

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

## Next recommended improvements

1. Verify the 13 halls against the official Warwick pages and populate `accommodations.json` (biggest quality win: unlocks bedding/cookware/appliance rules).
2. ~~Persist provider caches to the Supabase cache tables so all serverless instances share them.~~ Done: product search and offers caches now persist to `product_search_cache` / `offers_cache` in Supabase mode; only verified against a mocked client (no live Supabase project in this environment) - re-run `pnpm test:integration` against a real project's `rls.test.ts`-style setup, or exercise `/api/products/search` and `/api/offers` on two warm Vercel instances, to confirm cross-instance sharing end-to-end.
3. Add the parent role UI (share checklist/budget; contribution pot).
4. Price-drop and voucher-expiry alerts (needs a cron + email/push).
5. ~~Retailer feed adapters (Awin product feeds) to replace the shopping-search aggregator for stock-accurate data.~~ Done: `AwinFeedProductProvider` (`PRODUCT_PROVIDER=awin-feed`). Built and tested against mocked HTTP only — no real Awin datafeed account was available to verify the feed's actual column set or the download URL's exact query-parameter names against current Awin behaviour. Coverage is also inherently partial: it only searches the merchant feeds whose `AWIN_FEED_IDS` are configured, not every retailer the way the SerpApi aggregator does.
6. Moving-day packing mode and receipt capture (nice-to-haves from the spec).
