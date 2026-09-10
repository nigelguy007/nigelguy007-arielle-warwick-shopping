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
- Parent sharing: from `/me`, generate an invite link (`/share/[code]`); a parent signs in with the existing magic-link flow and lands on a read-only `/shared/[ownerId]` view (checklist progress + still-needed items, budget, and a "contribution pot" they can log payments/pledges into). Owner controls what's shared (checklist/budget), sees who has access, and can revoke it. See "Parent sharing" below.
- `pnpm check` (lint, typecheck, 72 unit/integration tests) and 8 Playwright E2E scenarios pass.

## What is mocked

| Provider | Mock | Live adapter | Needs |
|---|---|---|---|
| Product prices | `MockProductProvider` (~40 illustrative UK listings) | `SerpApiProductProvider` (Google Shopping, `gl=uk`, Coventry localisation) | `PRODUCT_PROVIDER=serpapi`, `SERPAPI_API_KEY` |
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

## Parent sharing

- **Model**: an owner (the student) creates a `share_invites` row (an 8-character code, default 14-day expiry, `can_view_checklist`/`can_view_budget` flags) from `/me`. A parent opens `${appUrl}/share/CODE`, signs in via the same Supabase magic-link flow as everyone else (no new auth mechanism), and the page calls the `redeem_share_invite(code)` Postgres function, which is `security definer` so it can write a `shared_access` row naming someone else's `owner_id` - gated entirely on the code being valid, unexpired and unredeemed, and rejecting the owner redeeming their own invite. From then on RLS (`*_shared_read` policies in `0001_init.sql`) lets the parent read the owner's `user_checklist`, `budgets`, `purchases` and `profiles` rows directly - the app never routes shared reads through a service-role client.
- **Read view** (`/shared/[ownerId]`): checklist progress (bought/still-needed/essentials) and the still-needed list with estimated prices; budget (set/spent/remaining); and the "contribution pot" - a new `contributions` table, deliberately separate from `purchases` so a parent's pledge is never conflated with the owner's own real spend. Any parent with budget access can see the whole pot (so contributors don't duplicate each other) and log their own entries (amount, optional note, optional specific checklist item); the owner can also view and manage it. Owners can also open their own `/shared/{their id}` as a "preview parent view" link from `/me`.
- **Managing access** (`/me` → "Share with a parent"): create/copy/revoke invite links, see and revoke active access, and (if someone has shared with you) a "Shared with me" list.
- **Local mode (`DATA_MODE=local`) is demo-only for this feature.** Local mode has exactly one real identity (`LOCAL_DEMO_USER_ID`) and no per-request auth, so there's no way to actually be a second, distinct signed-in "parent" locally. `LocalStore.redeemInvite` deliberately allows redeeming your own invite (unlike the Supabase RPC, which rejects it) so `/share/CODE` → `/shared/local-demo-user` works as a self-preview of what a parent would see - it exercises the same UI and store code paths, but proves nothing about real multi-user isolation. That only exists, and is tested (see below), in Supabase mode.
- **Tests**: `tests/unit/sharing.test.ts` covers `LocalStore` (invite lifecycle, redeem/expiry/reuse rejection, revoke, contributions isolation) and the invite-code generator. `tests/integration/rls.test.ts` adds a live-Supabase case (skipped without credentials, like the rest of that file) that creates a third throwaway user, has them redeem an invite with checklist-only access, and asserts they can read the checklist but not the budget/purchases, an unrelated stranger still sees nothing, a redeemed/self code is rejected, and a contribution can only be logged against an owner who actually shared budget access. `supabase/tests/rls.sql` (pgTAP, run via `supabase test db`) got equivalent coverage for the invite/redeem/shared-read path.

## Known limitations

- Local mode is single-instance and file-backed: fine for development and a demo, not for Vercel (read-only filesystem) or multiple users. This is also why parent sharing is demo-only there (see above).
- Provider caches are per server instance (in memory). The `product_search_cache` / `offers_cache` tables exist for a shared cache but are not yet used.
- The in-app Google map uses classic `google.maps.Marker`; switch to Advanced Markers with a Map ID if Google deprecates it in your project.
- Basket optimisation re-runs a compare per basket line, so with SerpApi it costs one shopping search per line (cached 30 min).
- The rule-based agent understands only the listed request patterns; anything else gets a hint of what it can do.
- Contributions are a running total shown alongside the budget, not subtracted from it - the app never assumes a pledge became a real purchase. Nothing yet notifies the owner when a parent logs one (would want the price-drop/voucher-expiry alert channel below).
- The Playwright suite runs on Chromium with an iPhone viewport (WebKit is not installed in this environment); it does not cover the parent-sharing flow (it needs a second signed-in identity, which only exists in Supabase mode).

## Next recommended improvements

1. Verify the 13 halls against the official Warwick pages and populate `accommodations.json` (biggest quality win: unlocks bedding/cookware/appliance rules).
2. Persist provider caches to the Supabase cache tables so all serverless instances share them.
3. Price-drop and voucher-expiry alerts (needs a cron + email/push) - and reuse that channel to notify an owner when a parent logs a contribution.
4. Retailer feed adapters (Awin product feeds) to replace the shopping-search aggregator for stock-accurate data.
5. Moving-day packing mode and receipt capture (nice-to-haves from the spec).
