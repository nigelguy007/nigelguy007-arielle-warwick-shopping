# Implementation plan

Source: `Arielle_Warwick_Shopping_App_Codex_Handoff.md`. The referenced source files
(`Arielle_Warwick_Shopping_Agent.md`, `warwick_move_in_checklist.csv`, `warwick_sources.md`,
the `.xlsx`) were **not** in the repository or the upload, so a checklist CSV in the specified
column format was authored from scratch (`data/warwick_move_in_checklist.csv`, 77 rows). Drop the
real CSV in its place and re-run `pnpm import:checklist`; source keys are derived from
Category + Item so re-imports update rather than duplicate.

## Locked decisions

| Area | Decision | Why |
|---|---|---|
| Stack | Next.js 16.3 App Router, React 19, TS 5.9, Tailwind 4, `ai` 7 + `@ai-sdk/react` 4, `@supabase/ssr` 0.12, Vitest 5, Playwright 1.63 | latest compatible at build time |
| Data | `DataStore` interface with `LocalStore` (JSON file, demo user) and `SupabaseStore` (RLS) | Phase 1 must not block on Supabase; tests run without a database |
| Auth | Supabase magic link; `src/proxy.ts` refreshes sessions and gates app routes; local mode auto-signs a demo user | "sign in without a complex password" |
| Providers | `ProductSearchProvider`, `MapProvider`, `OfferProvider` with mock + live adapters selected by `PRODUCT_PROVIDER` / `MAP_PROVIDER` / `OFFER_PROVIDER`; keys missing → mock automatically | must run without paid APIs |
| Caching | in-memory TTL cache keyed by hashed inputs (search 30 min, stores 6 h, offers ≤ soonest expiry); explicit `refresh=1` | cost control, "Checked N minutes ago" |
| Ranking | hard exclusions (`checkProductCompatibility`) before scoring; `value_score` = price ratio 0.30, rating 0.25, credibility 0.12, delivery 0.08, proximity 0.08, voucher 0.10, returns 0.07 | "hard exclusions beat scoring" |
| Agent | 14 tools bound per user + location; `streamText` through the AI Gateway when configured; rule-based fallback answers the six example requests otherwise | app must be useful with no AI key |
| PWA | `app/manifest.ts`, hand-written `public/sw.js` (network-first pages, cached checklist, price APIs never cached), generated icons | no dependency on a PWA plugin's Next 16 support |

## Vertical slices (in build order)

1. **Checklist end-to-end** – CSV parser → seed → LocalStore → `/checklist` with status actions, filters, offline queue. *Phase 1.*
2. **Budget** – budgets/purchases, `summariseBudget`, onboarding budget screen, `/me`. *Phase 1.*
3. **Search + compare** – mock/SerpApi provider, compatibility + value score, cheapest/best value/nearby cards, basket. *Phase 2.*
4. **Map** – mock/Google Places provider, location picker (device / campus / postcode), store cards, Google Maps JS when a browser key exists, multi-stop trip link. *Phase 3.*
5. **Offers** – mock/Awin provider, expiry + discount maths, student deep links, potential vs confirmed savings. *Phase 4.*
6. **Agent** – tools, system prompt, chat UI, fallback. Basket optimisation modes (cheapest / best value / one shop / local today / online only / student deals). *Phase 5.*
7. **Hardening** – Supabase migrations + RLS + pgTAP + live isolation test, health endpoint, structured logs, error boundary, CI workflow, docs.

## Test map

| Requirement | Test |
|---|---|
| CSV parsing | `tests/unit/csv.test.ts` |
| budget / discount maths | `budget.test.ts`, `offers.test.ts` |
| status transitions | `status.test.ts` |
| ranking + hard filters | `ranking.test.ts`, `compatibility.test.ts` |
| voucher expiry | `offers.test.ts`, `budget.test.ts` |
| Critical: non-induction pan never recommended | `compatibility.test.ts`, `ranking.test.ts` |
| Critical: supplied appliance not in Buy next | `buy-next.test.ts` |
| Critical: expired voucher never reduces basket | `budget.test.ts`, `basket-optimise.test.ts` |
| providers (mock + mocked HTTP + live when keyed) | `tests/integration/*-provider.test.ts` |
| RLS isolation | `tests/integration/rls.test.ts`, `supabase/tests/rls.sql` |
| E2E 10-step journey | `tests/e2e/journey.spec.ts` |
