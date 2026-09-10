# Arielle's Warwick Move-In Shopping Agent

A mobile-first PWA that turns the Warwick move-in checklist into a personal shopping agent: what's still needed, what to buy next, where it's cheapest (online or nearby), which vouchers apply, and how much budget is left.

Built with Next.js 16 (App Router), TypeScript, Tailwind v4, Supabase (Postgres + Auth + RLS), the Vercel AI SDK, Google Places API (New), SerpApi Google Shopping and Awin. Every external provider has a **mock adapter** so the whole app runs with zero paid credentials.

## Quick start (no keys needed)

```bash
cd arielle-warwick-shopping
pnpm install
cp .env.example .env.local        # defaults: DATA_MODE=local, all providers mock
pnpm dev                          # http://localhost:3000
```

Local mode seeds `data/warwick_move_in_checklist.csv` and `data/accommodations.json` into `./.data/store.json` on first request, creates a demo profile (Arielle), and skips sign-in. Mock prices, shops and offers are clearly labelled "Mock data · not live" and are refused in production.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` · `pnpm typecheck` | ESLint (Next + React compiler rules) · `tsc --noEmit` |
| `pnpm test` | Vitest unit + integration (integration live tests auto-skip without keys) |
| `pnpm test:e2e` | Playwright journey on an iPhone viewport against a fresh local-mode server |
| `pnpm check` | lint + typecheck + test |
| `pnpm import:checklist` | Idempotent CSV + accommodation import (`--csv`, `--accommodations`, `--user <uid>`, `--overwrite`) |
| `pnpm icons` | Regenerate PWA icons |

Reusing a pre-installed Chromium for E2E: `PW_CHROMIUM_PATH=/path/to/chrome pnpm test:e2e`.

## Production setup (Supabase + Vercel)

1. **Supabase project**
   - Run `supabase/migrations/0001_init.sql` (SQL editor or `supabase db push`). It creates all tables, the profile trigger and RLS policies.
   - Enable **Email (magic link)** under Authentication → Providers. Add your Vercel URL + `/auth/callback` to the redirect allow-list.
   - Copy the project URL, publishable key and secret key into env vars (below).
   - Seed the base checklist: `DATA_MODE=supabase NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... pnpm import:checklist`.
   - Optional RLS tests: `supabase test db` runs `supabase/tests/rls.sql`; `pnpm test:integration` runs `tests/integration/rls.test.ts` against the live project when the three Supabase env vars are set.
2. **Vercel**
   - Import the repo, set **Root Directory** to `arielle-warwick-shopping`. `vercel.json` pins pnpm, the London region and no-cache headers for the service worker.
   - Set the environment variables from `.env.example`. Minimum for production: `DATA_MODE=supabase`, the three Supabase vars, `NEXT_PUBLIC_APP_URL`.
   - Add provider keys as you get them: `PRODUCT_PROVIDER=serpapi` + `SERPAPI_API_KEY`, or `PRODUCT_PROVIDER=awin-feed` + `AWIN_DATAFEED_API_KEY` + `AWIN_FEED_IDS`; `MAP_PROVIDER=google` + `GOOGLE_MAPS_SERVER_API_KEY` (+ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for the in-app map); `OFFER_PROVIDER=awin` + Awin publisher credentials; `AI_GATEWAY_API_KEY` + `AI_MODEL` for the conversational agent.
   - Deploy. Open the URL on an iPhone → Share → **Add to Home Screen**.
3. **Invite Arielle**: send her the URL; she enters her email and taps the magic link. Her profile is created automatically and onboarding runs on first open.

Google keys: restrict the browser key by HTTP referrer to your domain and to the Maps JavaScript API only; restrict the server key to Places API (New), Geocoding and (optionally) Routes.

## Environment variables

There is no `.env.example` committed to this repo (root `.gitignore` excludes `.env*`, and one was never checked in) — this table is the source of truth. Nothing secret is ever read in client code: only `NEXT_PUBLIC_*` values reach the browser. Everything is optional; omitted provider keys fall back to mock automatically.

| Variable | Default | Purpose |
|---|---|---|
| `DATA_MODE` | `local` | `local` (file-backed demo store) or `supabase` (Postgres + RLS, real users). |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL used in auth redirects and deep links. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` | — | Required together for `DATA_MODE=supabase`. |
| `LOCAL_DATA_DIR` | `.data` (`/tmp/arielle-warwick-data` on Vercel) | Where `LocalStore` persists its JSON file in local mode. |
| `LOCAL_DEMO_FIRST_NAME` | `Arielle` | Display name for the auto-signed-in demo user in local mode. |
| `ALLOW_MOCK_IN_PRODUCTION` | unset | Set to `true` to allow mock prices/shops/offers on a real (`DATA_MODE=supabase`) deployment — throwaway demos only. |
| `PRODUCT_PROVIDER` | `mock` | `mock`, `serpapi` (Google Shopping) or `awin-feed` (Awin retailer product feeds). Falls back to `mock` if the required keys below are missing. |
| `SERPAPI_API_KEY` | — | Required for `PRODUCT_PROVIDER=serpapi`. |
| `AWIN_DATAFEED_API_KEY` | — | Required for `PRODUCT_PROVIDER=awin-feed`. The **datafeed download** API key from Awin's Create-a-Feed tool (Toolbox → Create-a-Feed) — **not** `AWIN_ACCESS_TOKEN` below, which is a different Awin API. |
| `AWIN_FEED_IDS` | — | Required for `PRODUCT_PROVIDER=awin-feed`. Comma-separated numeric feed ids (`fid`) of the advertiser programmes to search, e.g. `AWIN_FEED_IDS=12345,67890`. Awin has no free-text search across every advertiser — you configure which retailers' full catalogues to download and search locally. |
| `MAP_PROVIDER` | `mock` | `mock` or `google` (Places API (New)). Falls back to `mock` if `GOOGLE_MAPS_SERVER_API_KEY` is missing. |
| `GOOGLE_MAPS_SERVER_API_KEY` | — | Required for `MAP_PROVIDER=google` (Places, Geocoding, optionally Routes). Restrict to those APIs server-side. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | — | Browser key for the in-app Google Maps JS map. Restrict by HTTP referrer + Maps JavaScript API. |
| `GOOGLE_ROUTES_ENABLED` | `false` | Enables the Routes API for the multi-stop trip link (needs `GOOGLE_MAPS_SERVER_API_KEY`). |
| `OFFER_PROVIDER` | `mock` | `mock` or `awin` (Awin Publisher **promotions** API). Falls back to `mock` if the Awin vars below are missing. |
| `AWIN_PUBLISHER_ID` / `AWIN_ACCESS_TOKEN` | — | Required together for `OFFER_PROVIDER=awin`. OAuth publisher id + Bearer token for the promotions API — a different credential to the datafeed vars above. |
| `STUDENT_BEANS_PARTNER_KEY` / `UNIDAYS_PARTNER_KEY` | — | Reserved, unused. Student discounts are always public deep links, never a verified partner API. |
| `AI_GATEWAY_API_KEY` / `AI_MODEL` | — | Required together to enable the streaming AI agent via the Vercel AI Gateway; otherwise the rule-based fallback answers. |

## Project layout

```
data/                     checklist CSV, accommodation seed, sources
supabase/migrations/      schema + RLS         supabase/tests/rls.sql  pgTAP isolation test
scripts/                  import-checklist.ts, generate-icons.mjs
src/app/                  routes: (app)/{home,checklist,shop,map,me,agent}, onboarding, login, auth, api/*
src/lib/checklist         CSV parsing, status transitions
src/lib/budget            basket + budget maths      src/lib/offers   discount + expiry rules
src/lib/ranking           hard compatibility filters + value score
src/lib/recommendations   "Buy next"
src/lib/providers/        product (mock, serpapi) · map (mock, google) · offer (mock, awin, student links)
src/lib/store/            DataStore interface · LocalStore (file) · SupabaseStore (RLS)
src/lib/ai/               agent tools (14), system prompt, rule-based fallback
src/components/           UI
tests/unit · tests/integration · tests/e2e
```

## Data honesty rules (enforced in code)

- Every product, store and offer carries `provider`, `checkedAt` and `sourceConfidence` (`verified | unverified | mock`); the UI shows "Checked N minutes ago" and a refresh button.
- Store results say "Store location and hours only. This does not confirm the item is in stock here."
- Unverified offers are shown as **Potential savings** and never subtracted from a total. Expired offers are filtered everywhere.
- Student discounts are never scraped or verified by the app; it shows "Check student discount" deep links only.
- Accommodation fields stay `null` until `verified_at` is set from the official Warwick page. Bedding and cookware recommendations warn or refuse accordingly. Supplied appliances are excluded from Buy next and search.
- Production (`NODE_ENV=production` outside Vercel preview) refuses to show mock prices; set `ALLOW_MOCK_IN_PRODUCTION=true` only for a throwaway demo.
