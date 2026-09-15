/**
 * Reusable accommodation-listing scraper: for any UK university (or a
 * group, or all of them), find its official accommodation pages and
 * extract real, sourced listing data into Supabase. Never invents a
 * field - Firecrawl returns null for anything it can't find on the page,
 * and null is written as-is.
 *
 *   pnpm scrape:accommodation --ukprn 10007163               # one university
 *   pnpm scrape:accommodation --ukprn 10007163,10007850       # a group
 *   pnpm scrape:accommodation --all                            # every provider in data/uk_he_providers.json
 *   pnpm scrape:accommodation --all --limit 20                # first 20 only (rate/cost control)
 *
 * Needs:
 *   - FIRECRAWL_API_KEY        (https://firecrawl.dev - free tier has a
 *                                usable monthly credit allowance)
 *   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY (same as
 *     scripts/import-checklist.ts's Supabase mode)
 *
 * Pipeline per university (see resolveWebsite / findAccommodationPages /
 * extractListings below):
 *   1. Resolve the official website - reuse `universities.website_url` if
 *      already cached and checked in the last 90 days, else search fresh.
 *   2. Find candidate accommodation/halls pages on that site via a
 *      site-scoped search.
 *   3. Firecrawl EXTRACT against those pages with a frozen JSON schema
 *      (ACCOMMODATION_LISTING_SCHEMA below) - change it deliberately, not
 *      accidentally: a shifting schema makes extraction noisy across runs.
 *   4. Upsert each listing keyed on (university_ukprn, accommodation_name,
 *      room_type, academic_year), so re-runs update existing rows instead
 *      of creating duplicates. source_url and last_checked are stamped on
 *      every row.
 *
 * This script talks to Firecrawl's REST API directly (not the Firecrawl
 * MCP/Composio tools used interactively to build and pilot this
 * pipeline) so it can run unattended: in CI, a cron, or by hand, with
 * only an API key as a secret.
 */
import { createAdminSupabase } from "../src/lib/supabase/admin";
import providers from "../data/uk_he_providers.json";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const WEBSITE_CACHE_DAYS = 90;

interface Provider {
  ukprn: string;
  name: string;
  country: string;
}

interface AccommodationListing {
  accommodation_name: string | null;
  room_type: string | null;
  weekly_price: number | null;
  contract_length: string | null;
  total_cost: number | null;
  bathroom_type: "ensuite" | "shared" | null;
  catering_type: "catered" | "self-catered" | null;
  address: string | null;
  academic_year: string | null;
}

const ACCOMMODATION_LISTING_SCHEMA = {
  type: "object",
  properties: {
    listings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          accommodation_name: { type: ["string", "null"] },
          room_type: { type: ["string", "null"] },
          weekly_price: { type: ["number", "null"], description: "GBP per week, numeric only, null if not stated as a weekly rate" },
          contract_length: { type: ["string", "null"], description: "e.g. '51 weeks', '40 weeks (term time)'" },
          total_cost: { type: ["number", "null"], description: "GBP total for the full contract, null if not explicitly stated" },
          bathroom_type: { type: ["string", "null"], enum: ["ensuite", "shared", null] },
          catering_type: { type: ["string", "null"], enum: ["catered", "self-catered", null] },
          address: { type: ["string", "null"], description: "the accommodation's address or campus name" },
          academic_year: { type: ["string", "null"], description: "e.g. '2026/27'" },
        },
        required: ["accommodation_name"],
      },
    },
  },
  required: ["listings"],
} as const;

function apiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is required (get one at https://firecrawl.dev)");
  return key;
}

async function firecrawl(path: string, body: unknown) {
  const res = await fetch(`${FIRECRAWL_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firecrawl ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Cached in `universities.website_url`; only re-searched if missing or stale. */
async function resolveWebsite(db: ReturnType<typeof createAdminSupabase>, provider: Provider): Promise<string | null> {
  const { data: existing } = await db.from("universities").select("website_url, website_checked_at").eq("ukprn", provider.ukprn).maybeSingle();
  const staleCutoff = Date.now() - WEBSITE_CACHE_DAYS * 24 * 60 * 60 * 1000;
  if (existing?.website_url && existing.website_checked_at && Date.parse(existing.website_checked_at) > staleCutoff) {
    return existing.website_url as string;
  }
  const search = await firecrawl("/search", { query: `${provider.name} official website`, limit: 3 });
  const url = search?.data?.[0]?.url ?? null;
  await db.from("universities").upsert(
    { ukprn: provider.ukprn, name: provider.name, country: provider.country, website_url: url, website_checked_at: new Date().toISOString() },
    { onConflict: "ukprn" },
  );
  return url;
}

async function findAccommodationPages(websiteUrl: string): Promise<string[]> {
  const domain = new URL(websiteUrl).hostname;
  const search = await firecrawl("/search", { query: `site:${domain} accommodation halls of residence fees`, limit: 5 });
  const urls: string[] = (search?.data ?? []).map((r: { url: string }) => r.url).filter(Boolean);
  return urls.slice(0, 3); // keep the extract batch small - see known pitfalls in the firecrawl-automation skill
}

async function extractListings(urls: string[]): Promise<{ listings: AccommodationListing[]; sourceUrl: string }[]> {
  if (urls.length === 0) return [];
  const job = await firecrawl("/extract", { urls, schema: ACCOMMODATION_LISTING_SCHEMA, enableWebSearch: false });
  const jobId = job?.id;
  if (!jobId) return [];
  // Poll for completion (extract is async for multi-URL jobs).
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const res = await fetch(`${FIRECRAWL_BASE}/extract/${jobId}`, { headers: { Authorization: `Bearer ${apiKey()}` } });
    const status = await res.json();
    if (status.status === "completed") {
      const listings: AccommodationListing[] = status.data?.listings ?? [];
      // The extract endpoint doesn't attribute rows to a specific source
      // URL when multiple are given, so - never invent - fall back to the
      // first URL only when there's exactly one candidate page; with more
      // than one, record the whole candidate set isn't attributable per
      // row, so scope the batch to a single page per call from the caller.
      return [{ listings, sourceUrl: urls[0] }];
    }
    if (status.status === "failed") return [];
  }
  return [];
}

async function upsertListings(
  db: ReturnType<typeof createAdminSupabase>,
  provider: Provider,
  sourceUrl: string,
  listings: AccommodationListing[],
) {
  if (listings.length === 0) return 0;
  const now = new Date().toISOString();
  const rows = listings
    .filter((l) => l.accommodation_name)
    .map((l) => ({
      university_ukprn: provider.ukprn,
      university_name: provider.name,
      accommodation_name: l.accommodation_name,
      room_type: l.room_type,
      weekly_price: l.weekly_price,
      contract_length: l.contract_length,
      total_cost: l.total_cost,
      bathroom_type: l.bathroom_type,
      catering_type: l.catering_type,
      address: l.address,
      academic_year: l.academic_year,
      source_url: sourceUrl,
      last_checked: now,
      updated_at: now,
    }));
  const { error } = await db.from("accommodation_listings").upsert(rows, { onConflict: "university_ukprn,accommodation_name,room_type,contract_length,academic_year" });
  if (error) throw new Error(`upsert failed for ${provider.name}: ${error.message}`);
  return rows.length;
}

async function scrapeOne(db: ReturnType<typeof createAdminSupabase>, provider: Provider) {
  const website = await resolveWebsite(db, provider);
  if (!website) return { provider: provider.name, status: "no-website-found" as const };
  const pages = await findAccommodationPages(website);
  if (pages.length === 0) return { provider: provider.name, status: "no-accommodation-page-found" as const, website };
  let total = 0;
  // One page per extract call, so every written row's source_url is the
  // exact page it came from (see the note in extractListings).
  for (const page of pages) {
    const [result] = await extractListings([page]);
    if (!result) continue;
    total += await upsertListings(db, provider, result.sourceUrl, result.listings);
  }
  return { provider: provider.name, status: "ok" as const, website, pagesChecked: pages.length, listingsWritten: total };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const db = createAdminSupabase();
  const all: Provider[] = providers as Provider[];

  let scope: Provider[];
  const ukprnArg = arg("ukprn");
  if (ukprnArg) {
    const wanted = new Set(ukprnArg.split(","));
    scope = all.filter((p) => wanted.has(p.ukprn));
  } else if (process.argv.includes("--all")) {
    scope = all;
  } else {
    console.error("Pass --ukprn <one,or,more> or --all (optionally with --limit N)");
    process.exit(1);
  }
  const limit = arg("limit") ? Number(arg("limit")) : undefined;
  if (limit) scope = scope.slice(0, limit);

  console.log(`Scraping accommodation for ${scope.length} provider(s)...`);
  const results = [];
  for (const provider of scope) {
    try {
      results.push(await scrapeOne(db, provider));
    } catch (err) {
      results.push({ provider: provider.name, status: "error" as const, error: err instanceof Error ? err.message : String(err) });
    }
    console.log(JSON.stringify(results[results.length - 1]));
  }
  const written = results.reduce((sum, r) => sum + ("listingsWritten" in r ? (r.listingsWritten ?? 0) : 0), 0);
  console.log(`Done. ${written} listing(s) written/updated across ${scope.length} provider(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
